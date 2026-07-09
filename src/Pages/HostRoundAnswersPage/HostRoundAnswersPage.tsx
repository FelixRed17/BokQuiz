import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchRoundAnswers,
  type RoundAnswersDTO,
} from "../AdminLobbyPage/services/games.service";
import { ApiError } from "../../lib/errors";
import styles from "./HostRoundAnswersPage.module.css";

function getAnswerLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return typeof error === "string" ? error : "Unable to load round answers";
}

function isRoundAnswersUnavailable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;

  const message = error.message.toLowerCase();
  return (
    error.status === 422 ||
    message.includes("not between rounds") ||
    message.includes("completed rounds")
  );
}

function getRequestedRound(searchParams: URLSearchParams): number | undefined {
  const rawRound =
    searchParams.get("round_number") ?? searchParams.get("round");
  if (!rawRound) return undefined;

  const roundNumber = Number(rawRound);
  return Number.isInteger(roundNumber) && roundNumber > 0
    ? roundNumber
    : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadRoundAnswersWithRetry(
  gameCode: string,
  hostToken: string | undefined,
  requestedRound: number | undefined
): Promise<RoundAnswersDTO> {
  const maxAttempts = 6;
  let delayMs = 300;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const answers = await fetchRoundAnswers(
        gameCode,
        hostToken,
        requestedRound
      );

      if (answers.questions.length > 0 || attempt === maxAttempts) {
        return answers;
      }

      lastError = new Error("Round answers are not ready yet");
    } catch (error) {
      lastError = error;

      if (!isRoundAnswersUnavailable(error) || attempt === maxAttempts) {
        throw error;
      }
    }

    await sleep(delayMs);
    delayMs = Math.min(2000, Math.round(delayMs * 1.6));
  }

  throw lastError ?? new Error("Unable to load round answers");
}

export default function HostRoundAnswersPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedRound = getRequestedRound(searchParams);
  const [data, setData] = useState<RoundAnswersDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasHostAccess = Boolean(localStorage.getItem("hostToken"));

  useEffect(() => {
    let cancelled = false;

    const loadAnswers = async () => {
      const hostToken = localStorage.getItem("hostToken") ?? undefined;

      try {
        setIsLoading(true);
        setError(null);
        const answers = await loadRoundAnswersWithRetry(
          gameCode,
          hostToken,
          requestedRound
        );
        if (cancelled) return;
        setData(answers);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (gameCode) {
      loadAnswers();
    }

    return () => {
      cancelled = true;
    };
  }, [gameCode, requestedRound]);

  const sortedQuestions = useMemo(
    () => [...(data?.questions ?? [])].sort((a, b) => a.index - b.index),
    [data?.questions]
  );

  const handleContinue = () => {
    if (hasHostAccess) {
      navigate(`/game/${encodeURIComponent(gameCode)}/leaderboard`);
      return;
    }

    navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.statusPanel}>Loading round answers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.statusPanel}>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.primaryButton} onClick={handleContinue}>
            {hasHostAccess ? "Show Leaderboard" : "Continue to Results"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Game Code: {gameCode}</span>
          <h1 className={styles.title}>
            Round {data?.round_number ?? "-"} Answers
          </h1>
        </div>
        <button className={styles.primaryButton} onClick={handleContinue}>
          {hasHostAccess ? "Show Leaderboard" : "Continue to Results"}
        </button>
      </header>

      {sortedQuestions.length === 0 ? (
        <div className={styles.statusPanel}>
          No answers were returned for this round yet.
        </div>
      ) : (
        <main className={styles.questionGrid}>
          {sortedQuestions.map((question) => {
            const correctIndex = question.correct_index;
            const correctAnswer =
              question.correct_answer || question.options[correctIndex] || "";

            return (
              <article
                key={`${question.round}-${question.index}`}
                className={styles.questionCard}
              >
                <div className={styles.questionMeta}>
                  Question {question.index + 1}
                </div>
                <h2 className={styles.questionText}>{question.text}</h2>

                <div className={styles.answerBanner}>
                  <span className={styles.answerLabel}>
                    {getAnswerLabel(correctIndex)}
                  </span>
                  <span>{correctAnswer}</span>
                </div>

                <div className={styles.optionsList}>
                  {question.options.map((option, index) => (
                    <div
                      key={`${question.index}-${index}`}
                      className={`${styles.optionRow} ${
                        index === correctIndex ? styles.correctOption : ""
                      }`}
                    >
                      <span className={styles.optionLetter}>
                        {getAnswerLabel(index)}
                      </span>
                      <span className={styles.optionText}>{option}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </main>
      )}
    </div>
  );
}
