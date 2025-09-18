import React, { useEffect, useState } from "react";
import "./QuizScreen.css";
import Timer from "./components/Timer.tsx";
import QuestionCard from "./components/QuestionCard.tsx";
import OptionButton from "./components/OptionButton.tsx";

interface QuestionData {
  question: string;
  options: string[];
}
interface QuizScreenProps {
  questionData: QuestionData;
  onNext?: (selected: number | null) => void;
  questionNumber?: number;
}

const QuizScreen: React.FC<QuizScreenProps> = ({
  questionData,
  onNext,
  questionNumber = 1,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    setTimeLeft(30);
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [questionData]);

  useEffect(() => {
    if (timeLeft === 0 && onNext) onNext(selected);
  }, [timeLeft]);

  return (
    <div className="quiz-screen">
      <Timer timeLeft={timeLeft} />
      <div className="quiz-container">
        <QuestionCard
          question={questionData.question}
          questionNumber={questionNumber}
        />
        <div className="quiz-options">
          {questionData.options.map((opt, idx) => (
            <OptionButton
              key={idx}
              option={opt}
              index={idx}
              isSelected={selected === idx}
              onClick={setSelected}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="quiz-submit"
            onClick={() => onNext && onNext(selected)}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
