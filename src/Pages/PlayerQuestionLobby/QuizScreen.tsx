import React, { useEffect, useState } from "react";
import "./QuizScreen.css";
import Timer from "./components/Timer.tsx";
import QuestionCard from "./components/QuestionCard.tsx";
import OptionButton from "./components/OptionButton.tsx";
import { useSyncedTimer } from "../../hooks/useSyncedTimer";

interface QuestionData {
  question: string;
  options: string[];
  round_number?: number;
  ends_at?: string | null;
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
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [localSubmitted, setLocalSubmitted] = useState<boolean>(false);

  const isSuddenDeath = questionData.round_number === 4;
  
  // Use synchronized timer based on server's ends_at timestamp
  const timeLeft = useSyncedTimer(questionData.ends_at, 20);

  // Reset selected answer and start time when question changes
  useEffect(() => {
    setSelected(null);
    setStartTime(Date.now());
    setLocalSubmitted(false);
  }, [questionNumber, isSuddenDeath]);

  // Sync localSubmitted with parent's hasSubmitted to prevent stuck state
  useEffect(() => {
    if (!hasSubmitted) {
      setLocalSubmitted(false);
    }
  }, [hasSubmitted]);

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
    setLocalSubmitted(true);
    onNext(selected, latency);
  };

  return (
    <div className={`quiz-screen ${isSuddenDeath ? "sudden-death" : ""}`}>
      {isSuddenDeath }
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
              onClick={(i) => {
                if (localSubmitted || hasSubmitted || timeLeft === 0) return;
                setSelected(i);
              }}
              disabled={localSubmitted || hasSubmitted || timeLeft === 0}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            className="quiz-submit"
            onClick={handleSubmit}
            disabled={hasSubmitted || localSubmitted || selected === null}
          >
            {hasSubmitted ? "Submitted ✓" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizScreen;
