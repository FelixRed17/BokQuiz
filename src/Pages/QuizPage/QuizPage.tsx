import { useCallback, useEffect, useRef, useState } from "react";
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
type QuestionSyncSource = "socket" | "fetch";

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

function getQuestionKey(question: QuestionResponseDTO | null): string {
  if (!question) return "";
  return `${question.round_number}:${question.index}:${question.ends_at}`;
}

export default function QuizPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const locState = (location.state || {}) as LocationState;
  const initialQuestion = isQuestionPayload(locState.question)
    ? locState.question
    : null;

  const [question, setQuestion] = useState<QuestionResponseDTO | null>(
    initialQuestion
  );
  const [showQuiz, setShowQuiz] = useState(() => {
    if (!initialQuestion) return false;
    return (
      initialQuestion.index > 0 ||
      isSuddenDeathQuestionRound(initialQuestion.round_number)
    );
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [sdQuestionCount, setSdQuestionCount] = useState(0);
  const [playerName, setPlayerName] = useState<string>("");
  const questionRef = useRef<QuestionResponseDTO | null>(initialQuestion);
  const currentRoundRef = useRef(initialQuestion?.round_number ?? 0);
  const syncInFlightRef = useRef(false);

  const acceptQuestion = useCallback(
    (newQuestion: QuestionResponseDTO, source: QuestionSyncSource) => {
      const previousQuestion = questionRef.current;

      if (getQuestionKey(previousQuestion) === getQuestionKey(newQuestion)) {
        return;
      }

      const previousRound = currentRoundRef.current;
      questionRef.current = newQuestion;
      setQuestion(newQuestion);
      setHasSubmitted(false);

      if (isSuddenDeathQuestionRound(newQuestion.round_number)) {
        setSdQuestionCount((prev) => prev + 1);
        setShowQuiz(true);
        return;
      }

      setSdQuestionCount(0);

      if (
        source === "socket" &&
        newQuestion.index === 0 &&
        newQuestion.round_number !== previousRound
      ) {
        setShowQuiz(false);
      } else {
        setShowQuiz(true);
      }

      currentRoundRef.current = newQuestion.round_number;
    },
    []
  );

  const ensureSuddenDeathAccess = useCallback(
    async (newQuestion: QuestionResponseDTO): Promise<boolean> => {
      if (!isSuddenDeathQuestionRound(newQuestion.round_number)) return true;
      if (sessionStorage.getItem("inSuddenDeath") === "true") return true;

      try {
        const state = await fetchGameState(gameCode);
        const me = (
          sessionStorage.getItem("playerName") ||
          localStorage.getItem("playerName") ||
          ""
        )
          .toString()
          .trim()
          .toLowerCase();

        if (isPlayerInSuddenDeath(me, state?.suddenDeathParticipants)) {
          sessionStorage.setItem("inSuddenDeath", "true");
          return true;
        }
      } catch {
        // Treat an eligibility lookup failure as not eligible; the state poll
        // below will recover when the server is reachable again.
      }

      sessionStorage.setItem("inSuddenDeath", "false");
      setShowQuiz(false);
      navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
      return false;
    },
    [gameCode, navigate]
  );

  const syncQuestion = useCallback(
    async (newQuestion: QuestionResponseDTO, source: QuestionSyncSource) => {
      if (!(await ensureSuddenDeathAccess(newQuestion))) return;
      acceptQuestion(newQuestion, source);
    },
    [acceptQuestion, ensureSuddenDeathAccess]
  );

  const syncGameProgress = useCallback(async () => {
    if (!gameCode) return;

    try {
      const state = await fetchGameState(gameCode);

      if (state.status === "between_rounds") {
        const roundNumber = state.roundNumber;
        const query =
          typeof roundNumber === "number" && roundNumber > 0
            ? `?round_number=${roundNumber}`
            : "";
        navigate(`/game/${encodeURIComponent(gameCode)}/round-answers${query}`);
        return;
      }

      if (state.status === "finished") {
        navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
        return;
      }

      if (state.status === "sudden_death") {
        const me = (
          sessionStorage.getItem("playerName") ||
          localStorage.getItem("playerName") ||
          ""
        )
          .toString()
          .trim()
          .toLowerCase();

        if (!isPlayerInSuddenDeath(me, state.suddenDeathParticipants)) {
          sessionStorage.setItem("inSuddenDeath", "false");
          setShowQuiz(false);
          navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
        }
      }
    } catch {
      // Keep the current screen during transient sync failures.
    }
  }, [gameCode, navigate]);

  // Use the WebSocket hook
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        if (!isQuestionPayload(msg.payload)) return;
        const newQuestion = msg.payload;
        void syncQuestion(newQuestion, "socket");
      }

      if (msg.type === "round_ended") {
        console.log("Round ended - navigating to answer review");
        setSdQuestionCount(0); // Reset SD counter
        const roundNumber = isRecord(msg.payload)
          ? (typeof msg.payload.round_number === "number"
              ? msg.payload.round_number
              : typeof msg.payload.round === "number"
                ? msg.payload.round
                : undefined)
          : undefined;
        const query = roundNumber ? `?round_number=${roundNumber}` : "";
        const wait = 700 + Math.floor(Math.random() * 400);
        setTimeout(() => {
          navigate(`/game/${encodeURIComponent(gameCode)}/round-answers${query}`);
        }, wait);
      }

      if (msg.type === "sudden_death_eliminated") {
        console.log("SD elimination - navigating to player results");
        setSdQuestionCount(0); // Reset SD counter
        navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
      }
    },
  });

  // Keep the player synced to the host's canonical current question. This also
  // fixes refreshes where React Router restores stale location state.
  useEffect(() => {
    if (!gameCode) return;

    let cancelled = false;

    const pollQuestion = async () => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      try {
        const data = await fetchQuestion(gameCode);
        if (!cancelled) {
          await syncQuestion(data, "fetch");
        }
      } catch {
        if (!cancelled) {
          await syncGameProgress();
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    void pollQuestion();
    const interval = window.setInterval(pollQuestion, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [gameCode, syncGameProgress, syncQuestion]);

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
  const totalQuestions = isSuddenDeathQuestionRound(roundNumber) ? 4 : 5;

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
            totalQuestions={totalQuestions}
            onNext={handleSubmitAnswer}
            hasSubmitted={hasSubmitted}
          />
        </>
      )}
    </div>
  );
}
