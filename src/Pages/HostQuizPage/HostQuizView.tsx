import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useGameChannel } from "../../hooks/useGameChannel";
import { useGameState } from "../AdminLobbyPage/hooks/useGameState";
import CountDown from "../CountDownPage/CountDown"; // Import the CountDown component
import "./HostQuizView.css";

interface QuestionData {
  text: string;
  options: string[];
  index: number;
  round_number: number;
}

export default function HostQuizView() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const navigate = useNavigate();

  const initialQuestion = (location.state as any)?.question || null;

  const [question, setQuestion] = useState<QuestionData | null>(
    initialQuestion
  );
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [showQuiz, setShowQuiz] = useState(false);
  const currentRoundRef = useRef(initialQuestion?.round_number || 0);
  const lastQuestionIndexRef = useRef<number | null>(
    typeof initialQuestion?.index === "number" ? initialQuestion.index : null
  );
  // We no longer track per-question answered state for host UI

  const { state } = useGameState(gameCode, { pollIntervalMs: 2000 });

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        const newQuestion = msg.payload;
        setQuestion({
          text: newQuestion.text,
          options: newQuestion.options || [],
          index: newQuestion.index,
          round_number: newQuestion.round_number,
        });

        // Reset timer based on server-provided time remaining
        lastQuestionIndexRef.current =
          typeof newQuestion.index === "number" ? newQuestion.index : null;
        const ms =
          (newQuestion?.time_remaining_ms ??
            newQuestion?.timeRemainingMs ??
            state?.timeRemainingMs ??
            30000) as number;
        setTimeLeft(Math.ceil(ms / 1000));

        if (
          newQuestion.index === 0 &&
          newQuestion.round_number !== currentRoundRef.current
        ) {
          setShowQuiz(false); // Trigger countdown
          currentRoundRef.current = newQuestion.round_number;
        } else {
          setShowQuiz(true); // Skip countdown
        }
      }
      if (msg.type === "round_ended") {
        console.log("Round ended - navigating to leaderboard");
        navigate(`/game/${encodeURIComponent(gameCode)}/leaderboard`);
      }
    },
  });

  useEffect(() => {
    if (showQuiz && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showQuiz, timeLeft]);

  // When canonical game state moves to a new question, reset timer
  useEffect(() => {
    const idx = state?.currentQuestionIndex;
    if (typeof idx === "number" && idx !== lastQuestionIndexRef.current) {
      const ms = (state?.timeRemainingMs ?? 30000) as number;
      setTimeLeft(Math.ceil(ms / 1000));
      lastQuestionIndexRef.current = idx;
    }
  }, [state?.currentQuestionIndex, state?.timeRemainingMs]);

  const handleCountdownComplete = () => {
    setShowQuiz(true);
  };

  const handleNextQuestion = async () => {
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error("Host token missing");
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const url = `${apiBaseUrl}/api/v1/games/${encodeURIComponent(
        gameCode
      )}/host_next`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-Host-Token": hostToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to advance: ${error}`);
      }

      console.log("Successfully advanced to next question");
    } catch (err) {
      console.error("Error advancing question:", err);
      alert("Failed to advance to next question. Check console for details.");
    }
  };

  const players = state?.players ?? [];
  const activePlayers = players.filter((p) => !p.eliminated);

  if (!question) {
    return (
      <div className="host-quiz-loading">
        <p>Loading question...</p>
      </div>
    );
  }

  return (
    <div>
      {!showQuiz ? (
        <CountDown onComplete={handleCountdownComplete} />
      ) : (
        <div className="host-quiz-view">
          {/* Header */}
          <div className="host-header">
            <div className="host-title">
              <h1>Host Control Panel</h1>
              <span className="game-code">Game Code: {gameCode}</span>
            </div>
            <div className="timer-display">
              <div className="timer-circle">
                <span className="timer-value">{timeLeft}</span>
              </div>
            </div>
          </div>

          {/* Question Display */}
          <div className="question-section">
            <div className="question-header">
              <span className="question-number">
                Question {(question.index ?? 0) + 1}
              </span>
              <span className="round-number">
                Round {question.round_number ?? 1}
              </span>
            </div>
            <div className="question-text">
              <h2>{question.text}</h2>
            </div>
          </div>

          {/* Options Display */}
          <div className="options-grid">
            {(question.options || []).map((option, idx) => (
              <div key={idx} className={`option-card option-${idx}`}>
                <div className="option-letter">
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>

          {/* Players Section */}
          <div className="players-section">
            <h3>Active Players ({activePlayers.length})</h3>
            <div className="players-grid">
              {activePlayers.map((player) => (
                <div key={player.name} className="player-card">
                  <div className="player-name">{player.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="host-controls">
            <button className="btn-next" onClick={handleNextQuestion}>
              Next Question →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
