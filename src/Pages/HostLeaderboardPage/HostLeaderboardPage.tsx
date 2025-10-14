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
        // Update data if received via WebSocket (shouldn't happen for host, but handle it)
        console.log("Host received round_result broadcast:", msg.payload);
        const payload = msg.payload;
        if (payload && payload.leaderboard) {
          setData({
            round: payload.round || 1,
            leaderboard: payload.leaderboard || [],
            eliminated_names: payload.eliminated_names || [],
            next_state: payload.next_state || "between_rounds",
          });
          setIsLoading(false);
        }
      }
    },
  });

  useEffect(() => {
    const loadRoundResult = async () => {
      let attempts = 0;
      const maxAttempts = 10;
      const delayMs = 1000;

      while (attempts < maxAttempts) {
        try {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          const hostToken = localStorage.getItem("hostToken") || undefined;
          const result = await fetchRoundResult(gameCode, hostToken);

          const normalized = {
            round: result?.round || 1,
            leaderboard: Array.isArray(result?.leaderboard) ? result.leaderboard : [],
            eliminated_names: Array.isArray(result?.eliminated_names) ? result.eliminated_names : [],
            next_state: result?.next_state || "between_rounds",
          };

          if (!Array.isArray(normalized.leaderboard)) {
            attempts++;
            continue;
          }

          setData(normalized);
          setIsLoading(false);
          return;
        } catch (err: any) {
          attempts++;
          const msg = err?.data?.error?.message ?? err?.message ?? "Failed to load results";
          console.error(`Attempt ${attempts} failed:`, msg);
          if (attempts >= maxAttempts) {
            setError(msg);
            setIsLoading(false);
          }
        }
      }
    };

    loadRoundResult();
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
        err?.data?.error?.message ?? err?.message ?? "Failed to start next round";
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
            const isEliminated = (data?.eliminated_names ?? []).includes(entry.name);
            return (
              <div
                key={index}
                className={`${styles.tableRow} ${isEliminated ? styles.eliminated : ""}`}
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
            <strong>⚡ Sudden Death!</strong> Multiple players tied - sudden death round next
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

