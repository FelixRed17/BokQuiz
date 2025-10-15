import React, { useEffect, useState } from "react";
import "./QuizScreen.css";

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

const Timer: React.FC<{ timeLeft: number }> = ({ timeLeft }) => (
  <div
    style={{
      fontSize: "48px",
      fontWeight: "bold",
      textAlign: "center",
      margin: "20px 0",
      color: timeLeft <= 5 ? "#e74c3c" : "#2ecc71",
    }}
  >
    {timeLeft}s
  </div>
);

const QuestionCard: React.FC<{ question: string; questionNumber: number }> = ({
  question,
  questionNumber,
}) => (
  <div
    style={{
      background: "white",
      padding: "24px",
      borderRadius: "12px",
      marginBottom: "24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    }}
  >
    <div style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "8px" }}>
      Question {questionNumber}
    </div>
    <div style={{ fontSize: "20px", fontWeight: "600", color: "#2c3e50" }}>
      {question}
    </div>
  </div>
);

const OptionButton: React.FC<{
  option: string;
  index: number;
  isSelected: boolean;
  onClick: (index: number) => void;
}> = ({ option, index, isSelected, onClick }) => (
  <button
    onClick={() => onClick(index)}
    style={{
      width: "100%",
      padding: "16px",
      margin: "8px 0",
      fontSize: "16px",
      fontWeight: "500",
      border: isSelected ? "3px solid #3498db" : "2px solid #ddd",
      borderRadius: "8px",
      background: isSelected ? "#ebf5fb" : "white",
      cursor: "pointer",
      transition: "all 0.2s",
      textAlign: "left",
    }}
  >
    {option}
  </button>
);

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
    setSelected(null);
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
  }, [timeLeft]);

  const options = questionData.options || [];

  const handleSubmit = () => {
    if (!onNext) return;
    const latency = Date.now() - startTime;
    onNext(selected, latency);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isSuddenDeath
          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isSuddenDeath && (
        <div
          style={{
            background: "rgba(231, 76, 60, 0.95)",
            color: "white",
            padding: "16px 32px",
            borderRadius: "12px",
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "pulse 2s infinite",
            textAlign: "center",
          }}
        >
          ⚡ SUDDEN DEATH — Answer All 3 Questions!
        </div>
      )}

      <Timer timeLeft={timeLeft} />

      <div
        style={{
          maxWidth: "600px",
          width: "100%",
        }}
      >
        <QuestionCard
          question={questionData.question}
          questionNumber={questionNumber}
        />

        <div>
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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "24px",
          }}
        >
          <button
            onClick={handleSubmit}
            disabled={hasSubmitted || selected === null}
            style={{
              padding: "16px 48px",
              fontSize: "18px",
              fontWeight: "bold",
              background: hasSubmitted
                ? "#27ae60"
                : selected === null
                ? "#95a5a6"
                : "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor:
                hasSubmitted || selected === null ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            }}
          >
            {hasSubmitted ? "Submitted ✓" : "Submit"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default QuizScreen;
