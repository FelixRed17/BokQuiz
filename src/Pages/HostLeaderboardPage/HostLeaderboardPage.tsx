// File: src/Pages/HostLeaderboardPage.tsx
import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchFinalResults,
  fetchGameState,
  fetchQuestion,
  fetchRoundResult,
  hostNext,
} from "../AdminLobbyPage/services/games.service";
import { isSuddenDeathResult } from "../../lib/gameFlow";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message;
  if (typeof value === "string" && value.trim()) return value;

  if (isRecord(value)) {
    const candidates = [
      value.error_message,
      value.message,
      isRecord(value.error) ? value.error.message : value.error,
      isRecord(value.data) && isRecord(value.data.error)
        ? value.data.error.message
        : undefined,
    ];

    for (const candidate of candidates) {
      const message = getErrorMessage(candidate, "");
      if (message) return message;
    }
  }

  return fallback;
}

function getErrorStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;

  if (typeof value.status === "number") return value.status;
  if (isRecord(value.response) && typeof value.response.status === "number") {
    return value.response.status;
  }

  return undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getLeaderboard(value: unknown): LeaderboardEntry[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is LeaderboardEntry =>
          isRecord(entry) &&
          typeof entry.name === "string" &&
          typeof entry.round_score === "number"
      )
    : [];
}

function normalizeRoundResult(dto: unknown): RoundResultData {
  const record = isRecord(dto) ? dto : {};
  return {
    round: asNumber(record.round ?? record.round_number, 1),
    leaderboard: getLeaderboard(record.leaderboard),
    eliminated_names: getStringArray(record.eliminated_names),
    next_state: asString(record.next_state ?? record.nextState, "between_rounds"),
    sudden_death_players: getStringArray(
      record.sudden_death_players ?? record.sudden_death_participants
    ),
  };
}

function isRoundResultReadyError(error: unknown): boolean {
  const message = getErrorMessage(error, "").toLowerCase();
  const status = getErrorStatus(error);
  return (
    message.includes("not between rounds") ||
    status === 422 ||
    status === 404
  );
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
  const hasNavigatedRef = useRef(false as boolean);

  // Detect if we're showing sudden death results
  const isShowingSuddenDeathResults = isSuddenDeathResult(
    data?.round,
    data?.sudden_death_players
  );

  useHostWinnerNavigationFromState(data?.next_state);

  // Special fetch for sudden death results
  const fetchSuddenDeathResults = useCallback(async () => {
    try {
      console.log("Host: Fetching sudden death results from final results endpoint...");
      await fetchFinalResults(gameCode);
      
      // Try to get more detailed results from round_result as fallback
      const rr = await fetchRoundResult(gameCode);
      
      if (rr && Array.isArray(rr.leaderboard) && rr.leaderboard.length > 0) {
        const normalized = normalizeRoundResult({
          ...rr,
          round: rr.round_number ?? rr.round ?? 0,
          round_number: rr.round_number ?? rr.round ?? 0,
        });

        console.log("Host: Successfully fetched sudden death results:", normalized);
        setData(normalized);
        setIsLoading(false);
        setError(null);
        return;
      }
    } catch (err: unknown) {
      console.warn("Host: Failed to fetch sudden death results:", err);
      // Fall back to regular fetch - this will be handled by the main fetch logic
    }
  }, [gameCode]);

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        // Navigate to host quiz view when next round starts
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question: msg.payload },
        });
      }

      if (msg.type === "game_finished") {
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          setTimeout(() => {
            navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
          }, 4000);
        }
      }

      if (msg.type === "sudden_death_eliminated") {
        console.log("Received sudden_death_eliminated, checking if game is finished...");
        // After SD elimination, check game state and navigate to winner if finished
        (async () => {
          try {
            // Small delay to allow server to update game state
            await new Promise(res => setTimeout(res, 500));
            const s = await fetchGameState(gameCode);
            if (s?.status === "finished" && !hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              console.log("Game is finished after SD elimination, navigating to winner");
              setTimeout(() => {
                navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
              }, 3000);
            }
          } catch (err) {
            console.warn("Failed to check game state after SD elimination:", err);
          }
        })();
      }

      if (msg.type === "round_result") {
        console.log("Received round_result broadcast:", msg.payload);

        const payload = isRecord(msg.payload) ? msg.payload : {};

        // If payload already contains a full leaderboard, use it immediately.
        if (
          Array.isArray(payload.leaderboard) &&
          payload.leaderboard.length > 0
        ) {
          const normalized = {
            round: asNumber(payload.round ?? payload.round_number, 1),
            leaderboard: getLeaderboard(payload.leaderboard),
            eliminated_names: getStringArray(payload.eliminated_names),
            next_state:
              asString(payload.next_state ?? payload.nextState, "between_rounds"),
            sudden_death_players:
              getStringArray(
                payload.sudden_death_players ??
                  payload.sudden_death_participants
              ),
          };
          setData(normalized);
          setIsLoading(false);
          setError(null);
          return;
        }

        // If server explicitly marked final or included a result id, do a single fetch (should succeed).
        if (payload.final || payload.result_id) {
          (async () => {
            try {
              const rr = await fetchRoundResult(gameCode);
              setData({
                round: rr.round ?? rr.round_number ?? 1,
                leaderboard: rr.leaderboard ?? [],
                eliminated_names: rr.eliminated_names ?? [],
                next_state: rr.next_state ?? "between_rounds",
                sudden_death_players: rr.sudden_death_players ?? [],
              });
              setIsLoading(false);
              setError(null);
            } catch (e: unknown) {
              console.warn(
                "fetchRoundResult failed even though payload was final — trying fallback to /results:",
                e
              );
              // fallback to /results
              setData({
                round: 0,
                leaderboard: [],
                eliminated_names: [],
                next_state: "finished",
                sudden_death_players: [],
              });
              setIsLoading(false);
              setError(null);
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
                sudden_death_players: rr.sudden_death_players ?? [],
              });
              setIsLoading(false);
              setError(null);
              return;
            } catch (err: unknown) {
              const msg = getErrorMessage(err, String(err));
              // If server responds 'Not between rounds' / 422, wait and retry.
              if (isRoundResultReadyError(err)) {
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

          // If we exhausted polling attempts, try final /results as a last-resort fallback:
          setData({
            round: 0,
            leaderboard: [],
            eliminated_names: [],
            next_state: "finished",
            sudden_death_players: [],
          });
          setIsLoading(false);
          setError(null);
          return;

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

    const tryFetchOnce = async () => {
      if (!gameCode) return;
      try {
        // Check if we should fetch sudden death results
        const gameState = await fetchGameState(gameCode);
        if (
          gameState?.status === "finished" &&
          isSuddenDeathResult(gameState?.roundNumber, undefined)
        ) {
          console.log("Host: Game finished after sudden death, fetching sudden death results...");
          await fetchSuddenDeathResults();
          return;
        }

        const result = await fetchRoundResult(gameCode);
        const normalized = normalizeRoundResult(result);

        if (!cancelled) {
          setData(normalized);
          setIsLoading(false);
          setError(null);
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err, String(err));
        console.warn("Round result fetch failed:", msg);

        // If server says not between rounds, don't hammer it — try fallback to final results once.
        if (isRoundResultReadyError(err)) {
          // polite re-check once after 5s in case broadcast was missed, and also attempt final /results fallback right away.
          if (!cancelled) {
            setData({
              round: 0,
              leaderboard: [],
              eliminated_names: [],
              next_state: "finished",
              sudden_death_players: [],
            });
            setIsLoading(false);
            setError(null);
            return;
          }
        } else {
          // For other errors, surface to UI
          if (!cancelled) {
            setError(msg);
            setIsLoading(false);
          }
        }
      }
    };

    tryFetchOnce();

    return () => {
      cancelled = true;
    };
  }, [fetchSuddenDeathResults, gameCode]);

  // Fallback: poll game state to detect finished and navigate if WS missed or payload incomplete
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (cancelled || hasNavigatedRef.current) return;
      try {
        const s = await fetchGameState(gameCode);
        if (cancelled || hasNavigatedRef.current) return;
        if (s?.status === "finished") {
          hasNavigatedRef.current = true;
          setTimeout(() => {
            if (!cancelled) {
              navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
            }
          }, 2000);
          return;
        }
      } catch (err) {
        console.debug("Host leaderboard state poll failed:", err);
      }
      const jitter = Math.floor(Math.random() * 400);
      timer = setTimeout(poll, 1800 + jitter);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [gameCode, navigate]);

  const handleNextRound = async () => {
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error("Host token missing");
      return;
    }

    try {
      setIsProcessing(true);
      const result = await hostNext(gameCode, hostToken);

      if (result.sudden_death_ended) {
        if (result.next_status === "finished") {
          navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
        } else {
          const rr = await fetchRoundResult(gameCode);
          setData(normalizeRoundResult(rr));
        }
        return;
      }

      try {
        const question = await fetchQuestion(gameCode);
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question },
        });
      } catch {
        navigate(`/game/${encodeURIComponent(gameCode)}/host`);
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to start next round");
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
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>🧠</div>
          <h2 className={styles.title}>
            {isShowingSuddenDeathResults ? "⚡ Sudden Death Results" : `Round ${data.round} Results`}
          </h2>
        </div>
        <p className={styles.subtitle}>
          {isShowingSuddenDeathResults ? "Final Standings" : "Leaderboard"}
        </p>

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
                <span className={styles.dataScore}>
                  {isShowingSuddenDeathResults ? `${entry.round_score} (SD)` : entry.round_score}
                </span>
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
