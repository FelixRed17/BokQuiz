// File: src/Pages/HostLeaderboardPage.tsx
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
  sudden_death_players?: string[];
}

function useHostWinnerNavigationFromState(nextState: string | undefined) {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (nextState === "finished") {
      const timer = setTimeout(() => {
        navigate(`/game/${encodeURIComponent(code ?? "")}/winner`);
      }, 4000); // 4 seconds for host to see final leaderboard

      return () => clearTimeout(timer);
    }
  }, [nextState, navigate, code]);
}

export default function HostLeaderboardPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

  const [data, setData] = useState<RoundResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [roundResult] = useState<any>(null);

  useHostWinnerNavigationFromState(roundResult?.next_state);

  function normalizeRoundResult(dto: any): RoundResultData {
    return {
      round: dto?.round ?? dto?.round_number ?? 1,
      leaderboard: Array.isArray(dto?.leaderboard) ? dto.leaderboard : [],
      eliminated_names: Array.isArray(dto?.eliminated_names)
        ? dto.eliminated_names
        : [],
      next_state: dto?.next_state ?? dto?.nextState ?? "between_rounds",
      sudden_death_players: Array.isArray(dto?.sudden_death_players)
        ? dto.sudden_death_players
        : Array.isArray(dto?.sudden_death_participants)
        ? dto.sudden_death_participants
        : undefined,
    };
  }

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        // Navigate to host quiz view when next round starts
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question: msg.payload },
        });
      }

      if (msg.type === "game_finished") {
        setTimeout(() => {
          navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
        }, 4000);
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

  useEffect(() => {
    // New behavior: try one immediate fetch, then rely on websocket.
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryFetchOnce = async () => {
      if (!gameCode) return;
      try {
        const result = await fetchRoundResult(gameCode);
        const normalized = normalizeRoundResult(result);

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
      setIsProcessing(true);
      await http(`/api/v1/games/${encodeURIComponent(gameCode)}/host_next`, {
        method: "POST",
        headers: {
          "X-Host-Token": hostToken,
          Accept: "application/json",
        },
      });
      // Navigation/updating will happen via WebSocket message and canonical fetch
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ??
        err?.message ??
        "Failed to start next round";
      console.error(`Failed to proceed: ${msg}`);
    } finally {
      setIsProcessing(false);
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

        {/* Sudden death panel or regular button */}
        {data.next_state === "sudden_death" ? (
          <div className={styles.suddenDeathPanel}>
            <div className={styles.suddenDeathTitle}>
              ⚡ Sudden Death Participants
            </div>

            <div className={styles.suddenDeathList}>
              {(data.sudden_death_players ?? []).length > 0 ? (
                (data.sudden_death_players ?? []).map((n, i) => (
                  <div key={i} className={styles.suddenDeathPlayer}>
                    {n}
                  </div>
                ))
              ) : (
                <div className="text-muted">
                  Participants will appear shortly
                </div>
              )}
            </div>

            <div className="mt-3">
              <button
                className={styles.nextButton}
                onClick={handleNextRound}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Start Sudden Death"}
              </button>
            </div>
          </div>
        ) : (
          <button
            className={styles.nextButton}
            onClick={handleNextRound}
            disabled={data.next_state === "finished" || isProcessing}
          >
            {isProcessing
              ? "Processing..."
              : data.next_state === "finished"
              ? "Game Over"
              : "Next Round"}
          </button>
        )}
      </div>
    </div>
  );
}
