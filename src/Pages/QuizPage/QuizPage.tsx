// src/Pages/QuizPage/QuizPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import CountDown from "../CountDownPage/CountDown"; // create or adjust path
import QuizScreen from "../PlayerQuestionLobby/QuizScreen";
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
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no question in state (players), fetch the question
  useEffect(() => {
    if (question) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = await fetchQuestion(gameCode);
        if (!mounted) return;
        setQuestion(q);
      } catch (err: any) {
        setError(
          err?.data?.error?.message ?? err?.message ?? "Failed to load question"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [gameCode, question]);

  // Called when countdown finishes
  const handleCountdownComplete = () => {
    setShowQuiz(true);
  };

  if (loading) return <div className="p-4">Loading question...</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;
  if (!question)
    return <div className="p-4 text-muted">No question available</div>;

  // Defensive checks for question data before passing to QuizScreen
  const questionText = question.text ?? "Question Text Missing";
  const questionIndex = typeof question.index === "number" ? question.index : 0;

  const questionData = {
    question: questionText,
    options: question.options,
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
            // submit answer — you can call submit endpoint here
            console.log("selected:", selected);
          }}
        />
      )}
    </div>
  );
}
