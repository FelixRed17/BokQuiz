import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useGameChannel } from "../../hooks/useGameChannel";
import { useGameState } from "../AdminLobbyPage/hooks/useGameState";
import { useSyncedTimer } from "../../hooks/useSyncedTimer";
import GameTimerPanel from "../../components/GameTimerPanel/GameTimerPanel";
import { fetchQuestion, hostNext } from "../AdminLobbyPage/services/games.service";
import { isSuddenDeathQuestionRound } from "../../lib/gameFlow";
import { ROUND_END_NAVIGATION_DELAY_MS } from "../../constants/game";
import CountDown from "../CountDownPage/CountDown";
import "./HostQuizView.css";

interface QuestionData {
  text: string;
  options: string[];
  index: number;
  round_number: number;
  ends_at?: string;
  time_remaining_ms?: number;
  timeRemainingMs?: number;
  correct_index?: number;
  correctIndex?: number;
}

type HostQuizLocationState = {
  question?: QuestionData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function isQuestionData(value: unknown): value is QuestionData {
  return (
    isRecord(value) &&
    typeof value.text === "string" &&
    Array.isArray(value.options) &&
    typeof value.index === "number" &&
    typeof value.round_number === "number"
  );
}

function getCorrectIndex(question: QuestionData): number | null {
  if (typeof question.correct_index === "number") return question.correct_index;
  if (typeof question.correctIndex === "number") return question.correctIndex;
  return null;
}

function getRoundNumber(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const roundNumber = record.round_number ?? record.roundNumber ?? record.round;
  return typeof roundNumber === "number" && Number.isFinite(roundNumber)
    ? roundNumber
    : null;
}

function toPositiveRound(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return undefined;
}

const LAST_QUESTION_AUTO_ADVANCE_MS = 1500;

export default function HostQuizView() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const location = useLocation();
  const navigate = useNavigate();

  const locationState = (location.state || {}) as HostQuizLocationState;
  const initialQuestion = isQuestionData(locationState.question)
    ? locationState.question
    : null;

  const [question, setQuestion] = useState<QuestionData | null>(
    initialQuestion
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const isAdvancingRef = useRef(false);
  const currentRoundRef = useRef(initialQuestion?.round_number || 0);
  const lastQuestionIndexRef = useRef<number | null>(
    typeof initialQuestion?.index === "number" ? initialQuestion.index : null
  );
  // We no longer track per-question answered state for host UI

  const { state } = useGameState(gameCode, { pollIntervalMs: 2000 });

  const navigateToRoundAnswers = useCallback(
    (roundNumber?: unknown) => {
      const resolvedRound =
        toPositiveRound(roundNumber) ??
        toPositiveRound(question?.round_number) ??
        toPositiveRound(currentRoundRef.current);
      const params = new URLSearchParams();

      if (resolvedRound) {
        params.set("round_number", String(resolvedRound));
      }

      const query = params.toString();
      navigate(
        `/game/${encodeURIComponent(gameCode)}/round-answers${
          query ? `?${query}` : ""
        }`
      );
    },
    [gameCode, navigate, question?.round_number]
  );

  const scheduleRoundAnswersNavigation = useCallback(
    (roundNumber?: unknown) => {
      window.setTimeout(() => {
        navigateToRoundAnswers(roundNumber);
      }, ROUND_END_NAVIGATION_DELAY_MS);
    },
    [navigateToRoundAnswers]
  );

  useEffect(() => {
    if (!gameCode || question) return;

    let cancelled = false;

    const loadCurrentQuestion = async () => {
      try {
        const currentQuestion = await fetchQuestion(gameCode);
        if (cancelled) return;
        setQuestion(currentQuestion);
        setShowQuiz(true);
        currentRoundRef.current = currentQuestion.round_number;
        lastQuestionIndexRef.current =
          typeof currentQuestion.index === "number" ? currentQuestion.index : null;
      } catch (err) {
        console.warn("Unable to load current question for host view:", err);
      }
    };

    loadCurrentQuestion();

    return () => {
      cancelled = true;
    };
  }, [gameCode, question]);

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        if (!isQuestionData(msg.payload)) return;
        const newQuestion = msg.payload;
        setQuestion({
          text: newQuestion.text,
          options: newQuestion.options || [],
          index: newQuestion.index,
          round_number: newQuestion.round_number,
          ends_at: newQuestion.ends_at,
          time_remaining_ms: newQuestion.time_remaining_ms ?? newQuestion.timeRemainingMs,
          correct_index: newQuestion.correct_index ?? newQuestion.correctIndex,
        });

        lastQuestionIndexRef.current =
          typeof newQuestion.index === "number" ? newQuestion.index : null;

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
        console.log("Round ended - navigating to answer review");
        scheduleRoundAnswersNavigation(getRoundNumber(msg.payload));
      }
      if (msg.type === "sudden_death_eliminated") {
        console.log("Sudden death ended - navigating to leaderboard");
        navigate(`/game/${encodeURIComponent(gameCode)}/leaderboard`);
      }
      if (msg.type === "game_finished") {
        console.log("Game finished - navigating to winner page");
        navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
      }
    },
  });

  const handleNextQuestion = useCallback(async () => {
    if (isAdvancingRef.current) return;

    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error("Host token missing");
      return;
    }

    try {
      isAdvancingRef.current = true;
      setIsAdvancing(true);
      const result = await hostNext(gameCode, hostToken);

      if (result.round_ended) {
        scheduleRoundAnswersNavigation(result.round_number);
        return;
      }

      if (result.sudden_death_ended) {
        navigate(
          result.next_status === "finished"
            ? `/game/${encodeURIComponent(gameCode)}/winner`
            : `/game/${encodeURIComponent(gameCode)}/leaderboard`
        );
        return;
      }

      if (!result.sudden_death_in_progress) {
        const nextQuestion = await fetchQuestion(gameCode);
        setQuestion(nextQuestion);
        lastQuestionIndexRef.current =
          typeof nextQuestion.index === "number" ? nextQuestion.index : null;

        if (result.next_round_started) {
          setShowQuiz(false);
          currentRoundRef.current = nextQuestion.round_number;
        } else {
          setShowQuiz(true);
        }
      }
    } catch (err) {
      console.error("Error advancing question:", err);
      alert("Failed to advance to next question. Check console for details.");
    } finally {
      isAdvancingRef.current = false;
      setIsAdvancing(false);
    }
  }, [gameCode, navigate, scheduleRoundAnswersNavigation]);

  const handleNextQuestionRef = useRef(handleNextQuestion);
  handleNextQuestionRef.current = handleNextQuestion;

  // Use synchronized timer - calculate ends_at from time_remaining_ms if needed
  const endsAt = question?.ends_at || 
    (question?.time_remaining_ms ? new Date(Date.now() + question.time_remaining_ms).toISOString() : null);
  const timeLeft = useSyncedTimer(endsAt, 20);
  const correctIndex = question ? getCorrectIndex(question) : null;
  const revealAnswer = timeLeft === 0 && correctIndex !== null;
  const isLastRegularQuestion =
    !!question &&
    !isSuddenDeathQuestionRound(question.round_number) &&
    question.index === 4;

  useEffect(() => {
    if (timeLeft !== 0 || !isLastRegularQuestion || isAdvancingRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!isAdvancingRef.current) {
        void handleNextQuestionRef.current();
      }
    }, LAST_QUESTION_AUTO_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [timeLeft, isLastRegularQuestion]);

  const handleCountdownComplete = () => {
    setShowQuiz(true);
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
            <GameTimerPanel timeLeft={timeLeft} className="host-game-timer" />
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
              <div
                key={idx}
                className={`option-card option-${idx} ${
                  revealAnswer && idx === correctIndex ? "correct" : ""
                }`}
              >
                <div className="option-letter">
                  {String.fromCharCode(65 + idx)}
                </div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
          {revealAnswer && correctIndex !== null && (
            <div className="correct-answer-banner">
              Correct answer: {String.fromCharCode(65 + correctIndex)} — {question.options[correctIndex]}
            </div>
          )}

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
            <button
              className="btn-next"
              onClick={() => {
                void handleNextQuestion();
              }}
              disabled={isAdvancing}
            >
              {isAdvancing
                ? "Advancing..."
                : isLastRegularQuestion
                  ? "End Round →"
                  : "Next Question →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
