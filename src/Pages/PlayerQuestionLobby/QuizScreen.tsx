import React, { useEffect, useState } from "react";
import "./QuizScreen.css";
import Timer from "./components/Timer.tsx";
import QuestionCard from "./components/QuestionCard.tsx";
import OptionButton from "./components/OptionButton.tsx";
import { useSyncedTimer } from "../../hooks/useSyncedTimer";
import { isSuddenDeathQuestionRound } from "../../lib/gameFlow";

interface QuestionData {
  question: string;
  options: string[];
  round_number?: number;
  ends_at?: string | null;
  correct_index?: number;
}

export interface QuizScreenProps {
  questionData: QuestionData;
  onNext?: (selected: number | null, latencyMs?: number) => void;
  questionNumber?: number;
  hasSubmitted?: boolean;
  totalQuestions?: number;
}

const QuizScreen: React.FC<QuizScreenProps> = ({
  questionData,
  onNext,
  questionNumber = 1,
  hasSubmitted = false,
  totalQuestions = 5,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [localSubmitted, setLocalSubmitted] = useState<boolean>(false);

  const isSuddenDeath = isSuddenDeathQuestionRound(questionData.round_number);
  
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
  const correctIndex = typeof questionData.correct_index === "number" ? questionData.correct_index : null;
  const revealAnswer = timeLeft === 0 && correctIndex !== null;
  const questionCount = Math.max(1, totalQuestions);
  const answeredQuestionCount = Math.min(
    questionCount,
    Math.max(0, questionNumber - 1 + (hasSubmitted || localSubmitted ? 1 : 0))
  );

  const handleSubmit = () => {
    if (!onNext) return;
    const latency = Date.now() - startTime;
    setLocalSubmitted(true);
    onNext(selected, latency);
  };

  return (
    <div className={`quiz-screen ${isSuddenDeath ? "sudden-death" : ""}`}>
      <div
        className="progress-bar-container"
        aria-label={`${answeredQuestionCount} of ${questionCount} questions answered`}
      >
        {Array.from({ length: questionCount }).map((_, idx) => (
          <div
            key={idx}
            className={`progress-bar-item ${
              idx < answeredQuestionCount ? "is-complete" : ""
            }`}
          />
        ))}
      </div>
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
              isCorrect={revealAnswer && idx === correctIndex}
              onClick={(i) => {
                if (localSubmitted || hasSubmitted || timeLeft === 0) return;
                setSelected(i);
              }}
              disabled={localSubmitted || hasSubmitted || timeLeft === 0}
            />
          ))}
        </div>
        {revealAnswer && correctIndex !== null && (
          <div className="revealed-answer-banner">
            Correct answer: {String.fromCharCode(65 + correctIndex)} — {options[correctIndex]}
          </div>
        )}
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
