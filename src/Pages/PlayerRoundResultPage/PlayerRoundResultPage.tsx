import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRoundResult,
  fetchGameState,
} from "../AdminLobbyPage/services/games.service";
import { useGameChannel } from "../../hooks/useGameChannel";
import { fetchFinalResults } from "../AdminLobbyPage/services/games.service";
import styles from "./PlayerRoundResultPage.module.css";

interface LeaderboardEntry {
  name: string;
  round_score: number;
}

interface RoundResultData {
  round: number;
  round_number: number;
  leaderboard: LeaderboardEntry[];
  eliminated_names: string[];
  next_state: string;
  sudden_death_players?: string[];
}

function useWinnerNavigation(gameStatus: string | undefined, isEliminated: boolean) {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    // Only auto-navigate to winner page if player is not eliminated
    if (gameStatus === "finished" && !isEliminated) {
      let cancelled = false;
      const tryNavigate = async () => {
        const gameCode = code ?? "";
        const maxAttempts = 8;
        let attempt = 0;
        let delayMs = 500;
        while (!cancelled && attempt < maxAttempts) {
          attempt += 1;
          try {
            await fetchFinalResults(gameCode);
            if (!cancelled) {
              navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
            }
            return;
          } catch (err: any) {
            const status = err?.status ?? err?.response?.status;
            const msg = err?.data?.error?.message ?? err?.message ?? String(err);
            if (
              status === 422 ||
              status === 404 ||
              (typeof msg === "string" && msg.toLowerCase().includes("not between rounds"))
            ) {
              const jitter = Math.floor(Math.random() * 300);
              const wait = delayMs + jitter;
              await new Promise((res) => setTimeout(res, wait));
              delayMs = Math.min(3000, Math.round(delayMs * 1.6));
              continue;
            } else {
              // For other errors, break and still navigate to avoid being stuck
              break;
            }
          }
        }
        if (!cancelled) {
          // Fallback: navigate after attempts to avoid hanging on results page
          navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
        }
      };
      tryNavigate();
      return () => {
        cancelled = true;
      };
    }
  }, [gameStatus, navigate, code, isEliminated]);
}

export default function PlayerRoundResultPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

  const [data, setData] = useState<RoundResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");

  // Track if we've already fetched to prevent duplicate requests
  const hasFetchedRef = useRef(false);
  const isUnmountedRef = useRef(false);
  
  const isEliminated = data?.eliminated_names?.includes(playerName) ?? false;
  useWinnerNavigation(data?.next_state, isEliminated);

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (isUnmountedRef.current) return;

      // Defensive: if any message carries sudden-death participants, set the flag immediately
      try {
        const raw = (msg?.payload?.sudden_death_participants ?? msg?.payload?.sudden_death_players) as any[] | undefined;
        const status = msg?.payload?.status as string | undefined;
        if (Array.isArray(raw) && (status === "sudden_death" || data?.next_state === "sudden_death")) {
          const name = (playerName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "").toString();
          const me = name.trim().toLowerCase();
          const normalized = raw.map((p: any) => (typeof p === "string" ? p : p?.name ?? "").toString().trim().toLowerCase());
          const isInSd = me.length > 0 && normalized.includes(me);
          sessionStorage.setItem("inSuddenDeath", isInSd ? "true" : "false");
        }
      } catch {}

      if (msg.type === "question_started") {
        // Don't navigate eliminated players to the next question
        if (isEliminated) {
          return;
        }
        
        const nextRound = msg?.payload?.round_number;
        const inSudden = sessionStorage.getItem("inSuddenDeath") === "true";
        if (nextRound === 4 && !inSudden) {
          // Double-check participation via a one-off state fetch to beat races
          (async () => {
            try {
              const s = await fetchGameState(gameCode);
              const me = (
                (playerName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "") as string
              )
                .toString()
                .trim()
                .toLowerCase();
              const raw = s?.suddenDeathParticipants ?? [];
              const normalized = (Array.isArray(raw) ? raw : []).map((p: any) =>
                (typeof p === "string" ? p : p?.name ?? "")
                  .toString()
                  .trim()
                  .toLowerCase()
              );
              if (me && normalized.includes(me)) {
                sessionStorage.setItem("inSuddenDeath", "true");
                navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
                  state: { question: msg.payload },
                });
              } else {
                sessionStorage.setItem("inSuddenDeath", "false");
                navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
              }
            } catch (_) {
              // Fallback to waiting if we cannot confirm participation
              navigate(`/game/${encodeURIComponent(gameCode)}/sudden-death-wait`);
            }
          })();
        } else {
          navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
            state: { question: msg.payload },
          });
        }
        return;
      }

      // If server announces game finished explicitly, navigate to winner page.
      if (msg.type === "game_finished") {
        // Don't navigate eliminated players to winner page
        if (!isEliminated) {
          setTimeout(() => {
            navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
          }, 3000);
        }
        return;
      }

      if (msg.type === "round_result") {
        console.log("Received round_result broadcast:", msg.payload);

        const payload = msg.payload ?? {};

        // Normalize the round number (handle both 'round' and 'round_number')
        const roundNum = payload.round_number ?? payload.round ?? 1;

        // Check if payload has complete data
        if (
          Array.isArray(payload.leaderboard) &&
          payload.leaderboard.length > 0
        ) {
          const normalized: RoundResultData = {
            round: roundNum,
            round_number: roundNum,
            leaderboard: payload.leaderboard,
            eliminated_names: payload.eliminated_names ?? [],
            next_state: payload.next_state ?? "between_rounds",
            sudden_death_players: payload.sudden_death_players ?? [],
          };

          console.log("Setting data from broadcast:", normalized);
          setData(normalized);
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true;
          // If we are not going into sudden death, clear flag
          if ((normalized.next_state ?? "") !== "sudden_death") {
            sessionStorage.removeItem("inSuddenDeath");
          }
          return;
        }

        // If payload indicates finished, accept minimal data to allow winner navigation
        if ((payload.next_state ?? payload.nextState) === "finished") {
          const normalized: RoundResultData = {
            round: roundNum,
            round_number: roundNum,
            leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
            eliminated_names: payload.eliminated_names ?? [],
            next_state: "finished",
            sudden_death_players: payload.sudden_death_players ?? payload.sudden_death_participants ?? [],
          };
          setData(normalized);
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true;
          return;
        }

        // If broadcast doesn't have full data, fetch from API
        console.log("Broadcast incomplete, fetching from API...");
        fetchResultsFromAPI();
      }
    },
  });

  // Load player identity from storage
  useEffect(() => {
    const storedName =
      sessionStorage.getItem("playerName") ??
      localStorage.getItem("playerName") ??
      "";
    setPlayerName(storedName);
  }, []);

  // One-time opportunistic fetch similar to host to avoid races where status isn't yet "between_rounds"
  useEffect(() => {
    let cancelled = false;

    const tryFetchOnce = async () => {
      if (!gameCode || hasFetchedRef.current || data) return;
      try {
        const rr = await fetchRoundResult(gameCode);
        if (cancelled) return;

        if (rr && Array.isArray(rr.leaderboard) && rr.leaderboard.length > 0) {
          const roundNum = rr.round_number ?? rr.round ?? 1;
          const normalized: RoundResultData = {
            round: roundNum,
            round_number: roundNum,
            leaderboard: rr.leaderboard,
            eliminated_names: rr.eliminated_names ?? [],
            next_state: rr.next_state ?? "between_rounds",
            sudden_death_players: (rr as any).sudden_death_players ?? [],
          };
          setData(normalized);
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true;
        }
      } catch (err: any) {
        const msg = (err?.data?.error?.message ?? err?.message ?? String(err)).toString();
        const status = err?.status ?? err?.data?.status ?? err?.response?.status;
        // If not-between-rounds (422/404), allow existing polling/backoff logic to proceed silently.
        if (
          (typeof msg === "string" && msg.toLowerCase().includes("not between rounds")) ||
          status === 422 ||
          status === 404
        ) {
          return;
        }
        if (!cancelled && !data) {
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    tryFetchOnce();
    return () => {
      cancelled = true;
    };
  }, [gameCode, data]);

  // Persist whether this player is in sudden death when data loads
  useEffect(() => {
    const name = playerName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "";
    const raw = data?.sudden_death_players ?? [];
    const me = name.trim().toLowerCase();
    const normalized = (Array.isArray(raw) ? raw : []).map((p: any) =>
      (typeof p === "string" ? p : p?.name ?? "").toString().trim().toLowerCase()
    );
    const shouldFlag = data?.next_state === "sudden_death" && me.length > 0 && normalized.includes(me);
    if (shouldFlag) {
      sessionStorage.setItem("inSuddenDeath", "true");
    } else if (data?.next_state === "sudden_death") {
      sessionStorage.setItem("inSuddenDeath", "false");
    }
  }, [data, playerName]);

  // Centralized fetch function with retry logic
  const fetchResultsFromAPI = async () => {
    if (hasFetchedRef.current || isUnmountedRef.current) {
      console.log("Skipping fetch - already fetched or unmounted");
      return;
    }

    const maxAttempts = 15; // allow a wider window for slower commits
    let attempt = 0;
    let delayMs = 450; // base backoff

    while (attempt < maxAttempts && !isUnmountedRef.current) {
      attempt++;

      try {
        console.log(
          `Fetching round result (attempt ${attempt}/${maxAttempts})...`
        );
        const rr = await fetchRoundResult(gameCode);

        if (isUnmountedRef.current) return;

        // Validate the response has required data
        if (rr && Array.isArray(rr.leaderboard) && rr.leaderboard.length > 0) {
          const roundNum = rr.round_number ?? rr.round ?? 1;

          const normalized: RoundResultData = {
            round: roundNum,
            round_number: roundNum,
            leaderboard: rr.leaderboard,
            eliminated_names: rr.eliminated_names ?? [],
            next_state: rr.next_state ?? "between_rounds",
            sudden_death_players: (rr as any).sudden_death_players ?? [],
          };

          console.log("Successfully fetched results:", normalized);
          setData(normalized);
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true;
          return;
        } else if (rr?.next_state === "finished") {
          // Accept finished state even without a leaderboard to allow winner flow
          const roundNum = rr.round_number ?? rr.round ?? 1;
          const normalized: RoundResultData = {
            round: roundNum,
            round_number: roundNum,
            leaderboard: Array.isArray(rr.leaderboard) ? rr.leaderboard : [],
            eliminated_names: rr.eliminated_names ?? [],
            next_state: "finished",
            sudden_death_players: (rr as any).sudden_death_players ?? [],
          };
          console.log("Results indicate finished; proceeding to winner flow.");
          setData(normalized);
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true;
          return;
        } else {
          console.warn(`Attempt ${attempt}: Invalid data structure`, rr);
        }
      } catch (err: any) {
        const msg = err?.data?.error?.message ?? err?.message ?? String(err);
        const status = err?.status ?? err?.data?.status;

        console.log(`Attempt ${attempt} failed:`, msg, `(status: ${status})`);

        // If it's a 422/404 or "Not between rounds", the server isn't ready yet -> backoff with jitter and retry
        if (
          status === 422 ||
          status === 404 ||
          (typeof msg === "string" && msg.toLowerCase().includes("not between rounds"))
        ) {
          if (attempt < maxAttempts) {
            const jitter = Math.floor(Math.random() * 250);
            const wait = delayMs + jitter;
            console.log(`Waiting ${wait}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, wait));
            delayMs = Math.min(3500, Math.round(delayMs * 1.5));
            continue;
          }
        }

        // For other errors or if attempts exhausted, surface error and stop
        if (!isUnmountedRef.current && !data) {
          setError(msg);
          setIsLoading(false);
        }
        return;
      }
    }

    // If we exhausted all attempts
    if (!isUnmountedRef.current && !data) {
      console.error("Exhausted all retry attempts");
      setError("Unable to load results after multiple attempts");
      setIsLoading(false);
    }
  };

  // Special fetch for sudden death results - try to get final results instead
  const fetchSuddenDeathResults = async () => {
    if (hasFetchedRef.current || isUnmountedRef.current) {
      console.log("Skipping sudden death fetch - already fetched or unmounted");
      return;
    }

    try {
      console.log("Fetching sudden death results from final results endpoint...");
      await fetchFinalResults(gameCode);
      
      // Try to get more detailed results from round_result as fallback
      const rr = await fetchRoundResult(gameCode);
      
      if (rr && Array.isArray(rr.leaderboard) && rr.leaderboard.length > 0) {
        const roundNum = rr.round_number ?? rr.round ?? 4; // Assume round 4 for sudden death

        const normalized: RoundResultData = {
          round: roundNum,
          round_number: roundNum,
          leaderboard: rr.leaderboard,
          eliminated_names: rr.eliminated_names ?? [],
          next_state: rr.next_state ?? "finished",
          sudden_death_players: (rr as any).sudden_death_players ?? [],
        };

        console.log("Successfully fetched sudden death results:", normalized);
        setData(normalized);
        setIsLoading(false);
        setError(null);
        hasFetchedRef.current = true;
        return;
      }
    } catch (err: any) {
      console.warn("Failed to fetch sudden death results:", err);
      // Fall back to regular fetch
      await fetchResultsFromAPI();
    }
  };

  // Initial load via polling game state
  useEffect(() => {
    isUnmountedRef.current = false;

    if (data || hasFetchedRef.current) {
      console.log("Data already loaded, skipping initial fetch");
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const pollGameState = async () => {
      if (cancelled || hasFetchedRef.current) return;

      try {
        console.log("Polling game state...");
        const gameState = await fetchGameState(gameCode);

        if (cancelled) return;

        console.log("Game state:", gameState?.status);

        // If server indicates sudden death, set the participation flag early from state
        if (gameState?.status === "sudden_death") {
          const name = playerName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "";
          const me = name.toString().trim().toLowerCase();
          const raw = gameState?.suddenDeathParticipants ?? [];
          const normalized = (Array.isArray(raw) ? raw : []).map((p: any) =>
            (typeof p === "string" ? p : p?.name ?? "").toString().trim().toLowerCase()
          );
          const isInSd = me.length > 0 && normalized.includes(me);
          sessionStorage.setItem("inSuddenDeath", isInSd ? "true" : "false");
        }

        // If game has finished, set minimal data to trigger winner navigation
        if (gameState?.status === "finished") {
          console.log("Game state indicates finished; preparing winner flow...");
          setData({
            round: gameState?.roundNumber ?? 0,
            round_number: gameState?.roundNumber ?? 0,
            leaderboard: [],
            eliminated_names: [],
            next_state: "finished",
            sudden_death_players: [],
          });
          setIsLoading(false);
          setError(null);
          hasFetchedRef.current = true; // prevent further fetch loops
          return;
        }

        // Check if results should be available
        if (
          gameState?.status === "between_rounds" ||
          gameState?.status === "round_ended" ||
          gameState?.status === "results_available"
        ) {
          console.log("Game state indicates results available, fetching...");
          await fetchResultsFromAPI();
          return;
        } else if (gameState?.status === "finished" && gameState?.roundNumber === 4) {
          console.log("Game finished after sudden death, fetching sudden death results...");
          await fetchSuddenDeathResults();
          return;
        } else {
          // Not ready yet, poll again
          // small jitter around 2s to avoid synchronized bursts
          const jitter = Math.floor(Math.random() * 300);
          const nextDelay = 2000 + jitter;
          console.log(`Status is ${gameState?.status}, polling again in ${nextDelay}ms...`);
          if (!cancelled) {
            pollTimer = setTimeout(pollGameState, nextDelay);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch game state:", err);
        if (!cancelled) {
          const jitter = Math.floor(Math.random() * 400);
          pollTimer = setTimeout(pollGameState, 3000 + jitter);
        }
      }
    };

    // Start polling after a short delay to give WebSocket a chance
    const initialTimer = setTimeout(pollGameState, 800 + Math.floor(Math.random() * 400));

    return () => {
      cancelled = true;
      isUnmountedRef.current = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (initialTimer) clearTimeout(initialTimer);
    };
  }, [gameCode, data]);

  // Watchdog: if still loading after a few seconds, force a fetch attempt
  useEffect(() => {
    if (!isLoading || hasFetchedRef.current) return;
    const watchdog = setTimeout(async () => {
      if (!hasFetchedRef.current && isLoading) {
        try {
          const s = await fetchGameState(gameCode);
          const st = s?.status;
          if (
            st === "between_rounds" ||
            st === "round_ended" ||
            st === "results_available"
          ) {
            console.log("Watchdog: state indicates results available. Forcing fetch...");
            await fetchResultsFromAPI();
          } else if (st === "finished") {
            if (s?.roundNumber === 4) {
              console.log("Watchdog: game finished after sudden death, fetching sudden death results...");
              await fetchSuddenDeathResults();
            } else {
              console.log("Watchdog: state is finished; setting minimal data to trigger winner flow.");
              setData({
                round: s?.roundNumber ?? 0,
                round_number: s?.roundNumber ?? 0,
                leaderboard: [],
                eliminated_names: [],
                next_state: "finished",
                sudden_death_players: [],
              });
              setIsLoading(false);
              setError(null);
              hasFetchedRef.current = true;
            }
          } else {
            console.log(`Watchdog: state is '${st}', skipping forced fetch.`);
          }
        } catch (e) {
          console.warn("Watchdog: failed to get state, skipping forced fetch.");
        }
      }
    }, 3500 + Math.floor(Math.random() * 1000));
    return () => clearTimeout(watchdog);
  }, [isLoading, gameCode]);

  // One-off check after we know playerName: snapshot state to flag sudden death participation ASAP
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const s = await fetchGameState(gameCode);
        if (cancelled) return;
        if (s?.status === "sudden_death") {
          const name = playerName || sessionStorage.getItem("playerName") || localStorage.getItem("playerName") || "";
          const me = name.toString().trim().toLowerCase();
          const raw = s.suddenDeathParticipants ?? [];
          const normalized = (Array.isArray(raw) ? raw : []).map((p: any) =>
            (typeof p === "string" ? p : p?.name ?? "").toString().trim().toLowerCase()
          );
          const isInSd = me.length > 0 && normalized.includes(me);
          sessionStorage.setItem("inSuddenDeath", isInSd ? "true" : "false");
        }
      } catch {}
    };
    if (playerName) check();
    return () => {
      cancelled = true;
    };
  }, [playerName, gameCode]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading results...</p>
          <p className="text-muted small">This should only take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>⚠️ Error Loading Results</h3>
          <p>{error}</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              hasFetchedRef.current = false;
              fetchResultsFromAPI();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>No Data Available</h3>
          <p>Unable to load round results</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => {
              setIsLoading(true);
              hasFetchedRef.current = false;
              fetchResultsFromAPI();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Detect if we're showing sudden death results
  const isShowingSuddenDeathResults = data?.round_number === 4 || 
    (data?.next_state === "finished" && data?.sudden_death_players && data.sudden_death_players.length > 0);
  
  const topThree = data.leaderboard.slice(0, 3);
  const playerRank =
    data.leaderboard.findIndex((entry) => entry.name === playerName) + 1;

  const handleReturnHome = () => {
    navigate("/");
  };

  return (
    <div className={styles.container}>
      <video
        className={styles.bgVideo}
        autoPlay
        muted
        loop
        playsInline
        src="/purplebackground.mp4"
      />
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>🤖</div>
          <h2 className={styles.title}>
            {isShowingSuddenDeathResults ? "⚡ Sudden Death Results!" : `Round ${data.round_number ?? data.round} Complete!`}
          </h2>
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
            <div className={styles.statusIcon}>🚀</div>
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

        {/* Sudden Death Results Notice */}
        {isShowingSuddenDeathResults && (
          <div className={styles.suddenDeathResultsNotice}>
            <div className={styles.suddenDeathIcon}>⚡</div>
            <h3 className={styles.suddenDeathTitle}>Sudden Death Results</h3>
            <p className={styles.suddenDeathMessage}>
              These are the final standings after the sudden death tie-breaker round.
            </p>
          </div>
        )}

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
                  {isShowingSuddenDeathResults ? `${entry.round_score} pts (SD)` : `${entry.round_score} pts`}
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

            {(data.sudden_death_players ?? []).length > 0 && (
              <div className={styles.suddenDeathList}>
                <strong>Participants:</strong>
                <ul>
                  {data.sudden_death_players!.map((n, idx) => (
                    <li key={idx}>{n}</li>
                  ))}
                </ul>
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

        {!isEliminated && (
          <div className={styles.waitingMessage}>
            Waiting for host to start the next round...
          </div>
        )}

        {/* Home Button for eliminated players */}
        {isEliminated && (
          <div className={styles.homeButtonContainer}>
            <button 
              className={styles.homeButton}
              onClick={handleReturnHome}
            >
              🏠 Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
