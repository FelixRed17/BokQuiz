import { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown";
import QuizScreen, { type QuizScreenProps } from "../PlayerQuestionLobby/QuizScreen";
import { useGameChannel } from "../../hooks/useGameChannel";
import { fetchQuestion, submitAnswer } from "../AdminLobbyPage/services/games.service";

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

  // Use the WebSocket hook
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        const newQuestion = msg.payload;
        setQuestion(newQuestion);
        setHasSubmitted(false); // Reset submission state for new question

        if (
          newQuestion.index === 0 &&
          newQuestion.round_number !== currentRound
        ) {
          setShowQuiz(false);
          setCurrentRound(newQuestion.round_number);
        } else {
          setShowQuiz(true);
        }
        setWsConnected(true);
      }
      if (msg.type === "round_ended") {
        console.log("Round ended - navigating to player results");
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
        setWsConnected(true); // Stop polling once we get data
      } catch (err) {
        console.log("Question not ready yet, will retry...");
      }
    };

    pollQuestion();
    const interval = setInterval(pollQuestion, 2000);
    return () => clearInterval(interval);
  }, [gameCode, question, wsConnected]);

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

  const questionData = {
    question: questionText,
    options: questionOptions,
  };

  return (
    <div>
      {!showQuiz ? (
        <CountDown onComplete={handleCountdownComplete} />
      ) : (
        <QuizScreen
          questionData={questionData}
          questionNumber={questionIndex + 1}
          onNext={handleSubmitAnswer}
          hasSubmitted={hasSubmitted}
        />
      )}
    </div>
  );
}
