import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchRoundResult } from "../AdminLobbyPage/services/games.service";
import { http } from "../../lib/http";
import { useGameChannel } from "../../hooks/useGameChannel";
import styles from "./HostLeaderboardPage.module.css";

interface LeaderboardEntry {
  name: string;
  round_score: number;
}

interface RoundResultData {
  round: number;
  leaderboard: LeaderboardEntry[];
  eliminated_names: string[];
  next_state: string;
}

export default function HostLeaderboardPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

  const [data, setData] = useState<RoundResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        // Navigate to host quiz view when next round starts
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question: msg.payload },
        });
      }
      if (msg.type === "round_result") {
        (async () => {
          try {
            const rr = await fetchRoundResult(gameCode);
            const roundValue = rr.round ?? (rr as any).round_number ?? 1;
            setData({
              round: roundValue,
              leaderboard: Array.isArray(rr.leaderboard) ? rr.leaderboard : [],
              eliminated_names: Array.isArray(rr.eliminated_names)
                ? rr.eliminated_names
                : [],
              next_state: rr.next_state ?? "between_rounds",
            });
            setIsLoading(false);
            setError(null);
          } catch (e) {
            console.error(
              "Failed to fetch canonical round_result after broadcast:",
              e
            );
          }
        })();
      }
    },
  });

  useEffect(() => {
    // New behavior: try one immediate fetch, then rely on websocket.
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryFetchOnce = async () => {
      if (!gameCode) return;
      try {
        const result = await fetchRoundResult(gameCode);

        const normalized = {
          round: result?.round || 1,
          leaderboard: Array.isArray(result?.leaderboard)
            ? result.leaderboard
            : [],
          eliminated_names: Array.isArray(result?.eliminated_names)
            ? result.eliminated_names
            : [],
          next_state: result?.next_state || "between_rounds",
        };

        if (!cancelled) {
          setData(normalized);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: any) {
        const msg = err?.data?.error?.message ?? err?.message ?? String(err);
        console.warn("Round result fetch failed:", msg);

        // If server says not between rounds, don't hammer it — wait for websocket or polite retry
        if (
          msg.toLowerCase().includes("not between rounds") ||
          err?.status === 422
        ) {
          if (!cancelled) {
            // polite re-check once after 5s in case broadcast was missed
            retryTimer = setTimeout(() => {
              if (!cancelled) tryFetchOnce();
            }, 5000);
          }
          return;
        }

        // For other errors, surface to UI
        if (!cancelled) {
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    tryFetchOnce();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [gameCode]);

  const handleNextRound = async () => {
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error("Host token missing");
      return;
    }

    try {
      await http(`/api/v1/games/${encodeURIComponent(gameCode)}/host_next`, {
        method: "POST",
        headers: {
          "X-Host-Token": hostToken,
          Accept: "application/json",
        },
      });
      // Navigation will happen via WebSocket message
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ??
        err?.message ??
        "Failed to start next round";
      console.error(`Failed to proceed: ${msg}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <video
        className={styles.bgVideo}
        autoPlay
        muted
        loop
        playsInline
        src="/Celebration.mp4"
      />
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>🏉</div>
          <h2 className={styles.title}>Round {data.round} Results</h2>
        </div>
        <p className={styles.subtitle}>Leaderboard</p>

        <hr className={styles.divider} />

        {/* Table Headers */}
        <div className={styles.tableHeaders}>
          <span className={styles.headerPlace}>Rank</span>
          <span className={styles.headerName}>Player</span>
          <span className={styles.headerScore}>Score</span>
        </div>

        {/* Leaderboard Table */}
        <div className={styles.tableBody}>
          {(data?.leaderboard ?? []).map((entry, index) => {
            const isEliminated = (data?.eliminated_names ?? []).includes(
              entry.name
            );
            return (
              <div
                key={index}
                className={`${styles.tableRow} ${
                  isEliminated ? styles.eliminated : ""
                }`}
              >
                <span className={styles.dataPlace}>{index + 1}</span>
                <span className={styles.dataName}>
                  {entry.name}
                  {isEliminated && (
                    <span className={styles.eliminatedBadge}>Eliminated</span>
                  )}
                </span>
                <span className={styles.dataScore}>{entry.round_score}</span>
              </div>
            );
          })}
        </div>

        {/* Next State Info */}
        {data.next_state === "sudden_death" && (
          <div className={styles.suddenDeathAlert}>
            <strong>⚡ Sudden Death!</strong> Multiple players tied - sudden
            death round next
          </div>
        )}

        {data.next_state === "finished" && (
          <div className={styles.finishedAlert}>
            <strong>🏆 Game Over!</strong> We have a winner!
          </div>
        )}

        {/* Button */}
        <button
          className={styles.nextButton}
          onClick={handleNextRound}
          disabled={data.next_state === "finished"}
        >
          {data.next_state === "finished" ? "Game Over" : "Next Round"}
        </button>
      </div>
    </div>
  );
}
