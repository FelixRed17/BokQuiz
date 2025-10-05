import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameChannel } from "../../hooks/useGameChannel";
import { fetchQuestion } from "../AdminLobbyPage/services/games.service";
import { useGameState } from "../AdminLobbyPage/hooks/useGameState";
import "./HostQuizView.css";
import { useLocation } from "react-router-dom";

interface QuestionData {
  text: string;
  options: string[];
  index: number;
  round_number: number;
}

export default function HostQuizView() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const location = useLocation();

  // Get initial question from navigation state
  const initialQuestion = (location.state as any)?.question || null;

  const [question, setQuestion] = useState<QuestionData | null>(
    initialQuestion
  );
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const { state } = useGameState(gameCode, { pollIntervalMs: 2000 });

  // Listen for WebSocket updates
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        setQuestion({
          text: msg.payload.text,
          options: msg.payload.options || [],
          index: msg.payload.index,
          round_number: msg.payload.round_number,
        });
        setTimeLeft(30);
      }
      if (msg.type === "round_ended") {
        // Navigate to results or next question
        console.log("Round ended");
      }
    },
  });

  // Fetch initial question if not available
  useEffect(() => {
    if (!question) {
      fetchQuestion(gameCode)
        .then((data) => {
          setQuestion({
            text: data.text,
            options: data.options || [],
            index: data.index,
            round_number: data.round_number,
          });
          setTimeLeft(30);
        })
        .catch((err) => {
          console.error("Failed to fetch question:", err);
        });
    }
  }, [gameCode, question]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleNextQuestion = async () => {
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error("Host token missing");
      return;
    }

    try {
      // Call your API to move to next question
      const response = await fetch(
        `/api/v1/games/${encodeURIComponent(gameCode)}/host_next`,
        {
          method: "POST",
          headers: {
            "X-Host-Token": hostToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to advance to next question");
      }

      // WebSocket will handle updating the question
    } catch (err) {
      console.error("Error advancing question:", err);
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
            <div className="option-letter">{String.fromCharCode(65 + idx)}</div>
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
              <div className="player-status">
                {player.ready ? "✓ Answered" : "⏳ Thinking..."}
              </div>
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
  );
}
