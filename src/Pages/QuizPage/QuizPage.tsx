import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown";
import QuizScreen from "../PlayerQuestionLobby/QuizScreen";
import { useGameChannel } from "../../hooks/useGameChannel"; // New import

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

  // Use the new hook to listen for server events
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      // The server broadcasts a 'question_started' event when a question is ready
      if (msg.type === "question_started") {
        setQuestion(msg.payload); // Update state with the new question data
        setShowQuiz(false); // Reset to show countdown
      }
    },
  });

  const handleCountdownComplete = () => {
    setShowQuiz(true);
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
          onNext={(selected) => {
            console.log("selected:", selected);
          }}
        />
      )}
    </div>
  );
}
