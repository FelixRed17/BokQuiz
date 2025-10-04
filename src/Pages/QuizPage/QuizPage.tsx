import { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown";
import QuizScreen from "../PlayerQuestionLobby/QuizScreen";
import { useGameChannel } from "../../hooks/useGameChannel";
import { fetchQuestion } from "../AdminLobbyPage/services/games.service";

type LocationState = { question?: any };

export default function QuizPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const locState = (location.state || {}) as LocationState;

  const [question, setQuestion] = useState<any | null>(
    locState.question ?? null
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // Use the WebSocket hook
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        setQuestion(msg.payload);
        setShowQuiz(false);
        setWsConnected(true);
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

    // Initial fetch
    pollQuestion();

    // Poll every 2 seconds if no question yet
    const interval = setInterval(pollQuestion, 2000);

    return () => clearInterval(interval);
  }, [gameCode, question, wsConnected]);

  const handleCountdownComplete = () => {
    setShowQuiz(true);
  };

  if (!question) {
    return (
      <div className="p-4 text-muted">
        Waiting for host to start the question...
        {!wsConnected && (
          <div className="mt-2">
            <small className="text-warning">
              ⚠️ WebSocket connection failed. Using polling fallback...
            </small>
          </div>
        )}
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
          onNext={(selected) => {
            console.log("selected:", selected);
          }}
        />
      )}
    </div>
  );
}
