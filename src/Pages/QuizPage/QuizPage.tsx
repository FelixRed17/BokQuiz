import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown";
import QuizScreen from "../PlayerQuestionLobby/QuizScreen";
import { useGameChannel } from "../../hooks/useGameChannel";
import {
  fetchQuestion,
  submitAnswer,
} from "../AdminLobbyPage/services/games.service";

type LocationState = { question?: any };

export default function QuizPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const navigate = useNavigate();
  const locState = (location.state || {}) as LocationState;

  const [question, setQuestion] = useState<any | null>(
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
        const newQuestion = msg.payload;
        setQuestion(newQuestion);
        setHasSubmitted(false); // Reset submission state for new question

        // Track SD questions (round_number = 4)
        if (newQuestion.round_number === 4) {
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
        navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
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
      } catch (err) {
        console.log("Question not ready yet, will retry...");
      }
    };

    pollQuestion();
    const interval = setInterval(pollQuestion, 2000);
    return () => clearInterval(interval);
  }, [gameCode, question, wsConnected]);

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

    try {
      await submitAnswer(
        gameCode,
        parseInt(playerId),
        reconnectToken,
        selectedIndex
      );
      console.log("Answer submitted successfully:", selectedIndex);
      setHasSubmitted(true);

      // In SD, show waiting message after submission
      if (question?.round_number === 4) {
        console.log(`SD Question ${sdQuestionCount} of 3 submitted`);
      }
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ?? err?.message ?? "Failed to submit answer";
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

  const questionData = {
    question: questionText,
    options: questionOptions,
    round_number: roundNumber,
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
