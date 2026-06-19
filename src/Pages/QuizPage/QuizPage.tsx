import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown";
import QuizScreen from "../PlayerQuestionLobby/QuizScreen";
import { useGameChannel } from "../../hooks/useGameChannel";
import {
  fetchQuestion,
  submitAnswer,
  fetchGameState,
  type QuestionResponseDTO,
} from "../AdminLobbyPage/services/games.service";
import {
  isPlayerInSuddenDeath,
  isSuddenDeathQuestionRound,
} from "../../lib/gameFlow";

type LocationState = { question?: QuestionResponseDTO };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isQuestionPayload(value: unknown): value is QuestionResponseDTO {
  return (
    isRecord(value) &&
    typeof value.round_number === "number" &&
    typeof value.index === "number" &&
    typeof value.text === "string" &&
    Array.isArray(value.options) &&
    typeof value.ends_at === "string"
  );
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message;
  if (typeof value === "string" && value.trim()) return value;

  if (isRecord(value)) {
    const nested =
      isRecord(value.data) && isRecord(value.data.error)
        ? value.data.error.message
        : undefined;
    const message = value.message ?? nested;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

export default function QuizPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const locState = (location.state || {}) as LocationState;

  const [question, setQuestion] = useState<QuestionResponseDTO | null>(
    locState.question ?? null
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentRound, setCurrentRound] = useState(question?.round_number ?? 0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [sdQuestionCount, setSdQuestionCount] = useState(0);
  const [playerName, setPlayerName] = useState<string>("");

  // Use the WebSocket hook
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        if (!isQuestionPayload(msg.payload)) return;
        const newQuestion = msg.payload;

        // If sudden death round begins and this player is not a participant, redirect to waiting page
        if (isSuddenDeathQuestionRound(newQuestion?.round_number)) {
          const inSudden = sessionStorage.getItem("inSuddenDeath") === "true";
          if (!inSudden) {
            (async () => {
              try {
                const s = await fetchGameState(gameCode);
                const me = (
                  (sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "") as string
                )
                  .toString()
                  .trim()
                  .toLowerCase();
                if (isPlayerInSuddenDeath(me, s?.suddenDeathParticipants)) {
                  sessionStorage.setItem("inSuddenDeath", "true");
                  setQuestion(newQuestion);
                  setHasSubmitted(false);
                  setSdQuestionCount((prev) => prev + 1);
                  setShowQuiz(true);
                } else {
                  sessionStorage.setItem("inSuddenDeath", "false");
                  setShowQuiz(false);
                  navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
                  return;
                }
              } catch {
                setShowQuiz(false);
                navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
                return;
              }
            })();
            return;
          }
        }
        setQuestion(newQuestion);
        setHasSubmitted(false); // Reset submission state for new question

        // Track sudden death questions.
        if (isSuddenDeathQuestionRound(newQuestion.round_number)) {
          setSdQuestionCount((prev) => prev + 1);
          setShowQuiz(true); // Go straight to quiz in SD
        } else if (
          newQuestion.index === 0 &&
          newQuestion.round_number !== currentRound
        ) {
          // New regular round - show countdown
          setShowQuiz(false);
          setCurrentRound(newQuestion.round_number);
          setSdQuestionCount(0); // Reset SD counter
        } else {
          setShowQuiz(true);
        }
        setWsConnected(true);
      }

      if (msg.type === "round_ended") {
        console.log("Round ended - navigating to player results");
        setSdQuestionCount(0); // Reset SD counter
        // Add a small randomized delay to allow server to commit results
        const jitter = Math.floor(Math.random() * 400); // 0-399ms
        const wait = 700 + jitter; // 700-1099ms total
        setTimeout(() => {
          navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
        }, wait);
      }

      if (msg.type === "sudden_death_eliminated") {
        console.log("SD elimination - navigating to player results");
        setSdQuestionCount(0); // Reset SD counter
        navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
      }
    },
  });

  // Fallback: Poll for questions if WebSocket doesn't connect
  useEffect(() => {
    if (question || wsConnected) return;

    const pollQuestion = async () => {
      try {
        const data = await fetchQuestion(gameCode);
        setQuestion(data);
        setWsConnected(true);
        setHasSubmitted(false); // Reset submission state for polled question
      } catch {
        console.log("Question not ready yet, will retry...");
      }
    };

    pollQuestion();
    const interval = setInterval(pollQuestion, 2000);
    return () => clearInterval(interval);
  }, [gameCode, question, wsConnected]);

  // Safety: Reset hasSubmitted when question changes (covers edge cases)
  useEffect(() => {
    if (question) {
      setHasSubmitted(false);
    }
  }, [question]);

  // Load player name for display during questions
  useEffect(() => {
    const storedName =
      sessionStorage.getItem("playerName") ??
      localStorage.getItem("playerName") ??
      "";
    setPlayerName(storedName);
  }, []);

  const handleCountdownComplete = () => {
    setShowQuiz(true);
  };

  const handleSubmitAnswer = async (selectedIndex: number | null) => {
    if (hasSubmitted) {
      console.log("Already submitted answer for this question");
      return;
    }

    if (selectedIndex === null) {
      console.log("No answer selected");
      return;
    }

    const playerId = sessionStorage.getItem("playerId");
    const reconnectToken = sessionStorage.getItem("reconnectToken");

    if (!playerId || !reconnectToken) {
      console.error("Player credentials not found");
      return;
    }

    // Optimistic UI: mark as submitted immediately to avoid UI delay
    setHasSubmitted(true);
    try {
      await submitAnswer(
        gameCode,
        parseInt(playerId),
        reconnectToken,
        selectedIndex
      );
      console.log("Answer submitted successfully:", selectedIndex);

      // In SD, show waiting message after submission
      if (isSuddenDeathQuestionRound(question?.round_number)) {
        console.log(`SD Question ${sdQuestionCount} of 3 submitted`);
      }
    } catch (err: unknown) {
      // Revert optimistic update on failure
      setHasSubmitted(false);
      const msg = getErrorMessage(err, "Failed to submit answer");
      console.error("Failed to submit answer:", msg);
      alert(`Failed to submit: ${msg}`);
    }
  };

  if (!question) {
    return (
      <div className="p-4 text-muted">
        Waiting for host to start the question...
      </div>
    );
  }

  const questionText = question.text ?? "Question Text Missing";
  const questionIndex = typeof question.index === "number" ? question.index : 0;
  const questionOptions = question.options ?? [];
  const roundNumber = question.round_number ?? 1;
  const endsAt = question.ends_at ?? null;

  const questionData = {
    question: questionText,
    options: questionOptions,
    round_number: roundNumber,
    ends_at: endsAt,
  };

  return (
    <div>
      {!showQuiz ? (
        <CountDown onComplete={handleCountdownComplete} />
      ) : (
        <>
          {playerName && (
            <div
              style={{
                position: "fixed",
                top: 12,
                left: 16,
                color: "#FFFFFF",
                fontWeight: 900,
                zIndex: 1000,
              }}
            >
              {playerName}
            </div>
          )}
          <QuizScreen
            key={`q-${roundNumber}-${questionIndex}`}
            questionData={questionData}
            questionNumber={questionIndex + 1}
            onNext={handleSubmitAnswer}
            hasSubmitted={hasSubmitted}
          />
        </>
      )}
    </div>
  );
}
