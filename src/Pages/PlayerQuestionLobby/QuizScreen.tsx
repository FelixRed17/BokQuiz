import React, { useEffect, useState } from "react";
import "./QuizScreen.css";
import Timer from "./components/Timer.tsx";
import QuestionCard from "./components/QuestionCard.tsx";
import OptionButton from "./components/OptionButton.tsx";

interface QuestionData {
  question: string;
  options: string[];
  round_number?: number;
}

export interface QuizScreenProps {
  questionData: QuestionData;
  onNext?: (selected: number | null, latencyMs?: number) => void;
  questionNumber?: number;
  hasSubmitted?: boolean;
}

const QuizScreen: React.FC<QuizScreenProps> = ({
  questionData,
  onNext,
  questionNumber = 1,
  hasSubmitted = false,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [startTime, setStartTime] = useState<number>(Date.now());

  const isSuddenDeath = questionData.round_number === 4;

  // Reset selected answer when question changes
  useEffect(() => {
    setSelected(null); // Clear selection for new question
    setTimeLeft(30);
    setStartTime(Date.now());
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [questionData]);

  useEffect(() => {
    if (timeLeft === 0 && onNext) {
      const latency = Date.now() - startTime;
      onNext(selected, latency);
    }
  }, [timeLeft, onNext, selected, startTime]);

  // Safely default to an empty array if questionData.options is undefined or null
  const options = questionData.options || [];

  const handleSubmit = () => {
    if (!onNext) return;
    const latency = Date.now() - startTime;
    onNext(selected, latency);
  };

  return (
    <div className={`quiz-screen ${isSuddenDeath ? "sudden-death" : ""}`}>
      {isSuddenDeath && (
        <div className="sudden-death-banner">
          ⚡ SUDDEN DEATH — Answer All 3 Questions!
        </div>
      )}
      <Timer timeLeft={timeLeft} />
      <div className="quiz-container">
        <QuestionCard
          question={questionData.question}
          questionNumber={questionNumber}
        />
        <div className="quiz-options">
          {/* Use the safely defaulted 'options' array */}
          {options.map((opt, idx) => (
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
            onClick={handleSubmit}
            disabled={hasSubmitted || selected === null}
          >
            {hasSubmitted ? "Submitted ✓" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
