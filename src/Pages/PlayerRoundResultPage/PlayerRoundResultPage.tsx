import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRoundResult,
  fetchGameState,
} from "../AdminLobbyPage/services/games.service";
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
  sudden_death_players?: string[];
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
      // Insert/replace your round_result handler with this

      if (msg.type === "round_result") {
        console.log("Received round_result broadcast:", msg.payload);

        const payload = msg.payload ?? {};

        // If payload already contains a full leaderboard, use it immediately.
        if (
          Array.isArray(payload.leaderboard) &&
          payload.leaderboard.length > 0
        ) {
          const normalized = {
            round: payload.round ?? payload.round_number ?? 1,
            leaderboard: payload.leaderboard,
            eliminated_names: payload.eliminated_names ?? [],
            next_state:
              payload.next_state ?? payload.nextState ?? "between_rounds",
            sudden_death_players:
              payload.sudden_death_players ??
              payload.sudden_death_participants ??
              [],
          };
          setData(normalized);
          setIsLoading(false);
          setError(null);
          return;
        }

        // If server explicitly marked final, do a single fetch (should succeed)
        if (payload.final || payload.result_id) {
          (async () => {
            try {
              const rr = await fetchRoundResult(gameCode);
              setData({
                round: rr.round ?? rr.round_number ?? 1,
                leaderboard: rr.leaderboard ?? [],
                eliminated_names: rr.eliminated_names ?? [],
                next_state: rr.next_state ?? "between_rounds",
                sudden_death_players: (rr as any).sudden_death_players ?? [],
              });
              setIsLoading(false);
              setError(null);
            } catch (e) {
              console.warn(
                "fetchRoundResult failed even though payload was final:",
                e
              );
            }
          })();
          return;
        }

        // Otherwise: payload appears to be a *signal* (no full data). Poll canonical endpoint with polite retries.
        (async () => {
          const maxAttempts = 5;
          let attempt = 0;
          let delayMs = 300; // start small (server might be committing)
          while (attempt < maxAttempts) {
            attempt += 1;
            try {
              const rr = await fetchRoundResult(gameCode);
              setData({
                round: rr.round ?? rr.round_number ?? 1,
                leaderboard: rr.leaderboard ?? [],
                eliminated_names: rr.eliminated_names ?? [],
                next_state: rr.next_state ?? "between_rounds",
                sudden_death_players: (rr as any).sudden_death_players ?? [],
              });
              setIsLoading(false);
              setError(null);
              return;
            } catch (err: any) {
              const msg =
                err?.data?.error?.message ?? err?.message ?? String(err);
              // If server responds 'Not between rounds' / 422, wait and retry.
              if (
                msg.toLowerCase().includes("not between rounds") ||
                err?.status === 422
              ) {
                console.debug(
                  `round_result not ready (attempt ${attempt}). Will retry in ${delayMs}ms.`
                );
                await new Promise((res) => setTimeout(res, delayMs));
                delayMs = Math.min(2000, Math.round(delayMs * 1.8)); // exponential backoff cap 2s
                continue;
              } else {
                // non-422: surface error and stop retrying
                console.warn("fetchRoundResult failed:", err);
                if (!data) {
                  // only set error if we don't already have results
                  setError(msg);
                  setIsLoading(false);
                }
                return;
              }
            }
          }
          console.warn(
            "round_result canonical not available after retries; will wait for next broadcast."
          );
        })();
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

  // POLL: Check game state, then fetch round_result only when state indicates results available
  useEffect(() => {
    if (data) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollGameState = async () => {
      if (!gameCode) return;
      try {
        const gameState = await fetchGameState(gameCode);

        // If server says results should be available, fetch them once
        if (
          gameState?.status === "between_rounds" ||
          gameState?.status === "round_ended" ||
          gameState?.status === "results_available"
        ) {
          try {
            const rr = await fetchRoundResult(gameCode);
            if (!cancelled && rr && Array.isArray(rr.leaderboard)) {
              setData({
                round: rr.round ?? rr.round_number ?? 1,
                leaderboard: rr.leaderboard ?? [],
                eliminated_names: rr.eliminated_names ?? [],
                next_state: rr.next_state ?? "between_rounds",
                sudden_death_players: (rr as any).sudden_death_players ?? [],
              });
              setIsLoading(false);
              setError(null);
              return;
            }
          } catch (err: any) {
            const msg =
              err?.data?.error?.message ?? err?.message ?? String(err);
            console.warn("fetchRoundResult failed during state poll:", msg);

            // If 422 / Not between rounds, rely on websocket (polite re-check)
            if (
              msg.toLowerCase().includes("not between rounds") ||
              err?.status === 422
            ) {
              if (!cancelled) {
                timer = setTimeout(pollGameState, 4000);
              }
              return;
            }

            // Other errors: retry with backoff
            if (!cancelled) {
              timer = setTimeout(pollGameState, 5000);
            }
            return;
          }
        } else {
          // Not ready yet — poll again politely
          if (!cancelled) {
            timer = setTimeout(pollGameState, 3000);
          }
        }
      } catch (err) {
        console.warn("fetchGameState failed during polling:", err);
        if (!cancelled) {
          timer = setTimeout(pollGameState, 5000);
        }
      }
    };

    pollGameState();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
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

            {/* show participants list if available */}
            {(data.sudden_death_players ?? []).length > 0 ? (
              <div className={styles.suddenDeathList}>
                <strong>Participants:</strong>
                <ul>
                  {data.sudden_death_players!.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-muted">
                Participants will be announced shortly.
              </div>
            )}
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
