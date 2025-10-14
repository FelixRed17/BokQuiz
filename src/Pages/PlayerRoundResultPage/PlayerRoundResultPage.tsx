import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchRoundResult } from "../AdminLobbyPage/services/games.service";
import { useGameChannel } from "../../hooks/useGameChannel";
import styles from "./PlayerRoundResultPage.module.css";

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

export default function PlayerRoundResultPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

  const [data, setData] = useState<RoundResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        // Navigate to quiz when next round starts
        navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
          state: { question: msg.payload },
        });
      }
      if (msg.type === "round_result") {
        // Receive round result data from WebSocket broadcast
        console.log("Received round_result broadcast:", msg.payload);
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

  // Load player identity from storage (prefer sessionStorage, fallback to localStorage)
  useEffect(() => {
    const storedName =
      sessionStorage.getItem("playerName") ??
      localStorage.getItem("playerName") ??
      "";
    setPlayerName(storedName);
  }, []);

  // Immediately poll for round results until WebSocket provides data
  // Stop polling as soon as data is received or on unmount
  useEffect(() => {
    if (data) return;

    let cancelled = false;
    let intervalId: any;

    const poll = async () => {
      try {
        const res = await fetchRoundResult(gameCode);
        if (!cancelled && res && Array.isArray(res.leaderboard)) {
          setData({
            round: res.round || 1,
            leaderboard: res.leaderboard || [],
            eliminated_names: res.eliminated_names || [],
            next_state: res.next_state || "between_rounds",
          });
          setIsLoading(false);
          setError(null);
        }
      } catch {
        // ignore transient errors during polling
      }
    };

    // Start immediately, then every 2s until data arrives
    poll();
    intervalId = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameCode, data]);

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

  const isEliminated = data.eliminated_names.includes(playerName);
  const topThree = data.leaderboard.slice(0, 3);
  const playerRank =
    data.leaderboard.findIndex((entry) => entry.name === playerName) + 1;

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
          <h2 className={styles.title}>Round {data.round} Complete!</h2>
        </div>

        {/* Player Status */}
        {isEliminated ? (
          <div className={styles.eliminatedStatus}>
            <div className={styles.statusIcon}>😔</div>
            <h3 className={styles.statusTitle}>You've Been Eliminated</h3>
            <p className={styles.statusMessage}>
              Better luck next time! Thanks for playing.
            </p>
          </div>
        ) : (
          <div className={styles.qualifiedStatus}>
            <div className={styles.statusIcon}>🎉</div>
            <h3 className={styles.statusTitle}>You Qualified!</h3>
            <p className={styles.statusMessage}>
              Great job! You're moving on to the next round.
            </p>
            {playerRank > 0 && (
              <div className={styles.yourRank}>Your Rank: #{playerRank}</div>
            )}
          </div>
        )}

        <hr className={styles.divider} />

        {/* Top 3 Players */}
        <div className={styles.topThreeSection}>
          <h3 className={styles.sectionTitle}>🏆 Top 3 Players</h3>
          <div className={styles.topThree}>
            {topThree.map((entry, index) => (
              <div
                key={index}
                className={`${styles.topThreeCard} ${
                  styles[`rank${index + 1}`]
                }`}
              >
                <div className={styles.medal}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                </div>
                <div className={styles.topThreeName}>{entry.name}</div>
                <div className={styles.topThreeScore}>
                  {entry.round_score} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eliminated Players */}
        {data.eliminated_names.length > 0 && (
          <>
            <hr className={styles.divider} />
            <div className={styles.eliminatedSection}>
              <h3 className={styles.sectionTitle}>❌ Eliminated</h3>
              <div className={styles.eliminatedList}>
                {data.eliminated_names.map((name, index) => (
                  <div key={index} className={styles.eliminatedPlayer}>
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Sudden Death or Game Over Notice */}
        {data.next_state === "sudden_death" && (
          <div className={styles.suddenDeathAlert}>
            <strong>⚡ Sudden Death Next!</strong>
            <p>Get ready for a tie-breaker round!</p>
          </div>
        )}

        {data.next_state === "finished" && (
          <div className={styles.finishedAlert}>
            <strong>🏆 Game Over!</strong>
            <p>Check out the final winner!</p>
          </div>
        )}

        <div className={styles.waitingMessage}>
          Waiting for host to start the next round...
        </div>
      </div>
    </div>
  );
}

