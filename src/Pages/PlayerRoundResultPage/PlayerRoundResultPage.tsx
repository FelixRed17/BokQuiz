import { useEffect, useState, useRef } from "react";
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
  round_number: number;
  leaderboard: LeaderboardEntry[];
  eliminated_names: string[];
  next_state: string;
  sudden_death_players?: string[];
}

function useWinnerNavigation(gameStatus: string | undefined) {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (gameStatus === "finished") {
      // Navigate to winner page after a short delay to show final results
      const timer = setTimeout(() => {
        navigate(`/game/${encodeURIComponent(code ?? "")}/winner`);
      }, 3000); // 3 second delay

      return () => clearTimeout(timer);
    }
  }, [gameStatus, navigate, code]);
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
  useWinnerNavigation(data?.next_state);

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (isUnmountedRef.current) return;

      if (msg.type === "question_started") {
        navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
          state: { question: msg.payload },
        });
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

  // Centralized fetch function with retry logic
  const fetchResultsFromAPI = async () => {
    if (hasFetchedRef.current || isUnmountedRef.current) {
      console.log("Skipping fetch - already fetched or unmounted");
      return;
    }

    const maxAttempts = 8;
    let attempt = 0;
    let delayMs = 500;

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
        } else {
          console.warn(`Attempt ${attempt}: Invalid data structure`, rr);
        }
      } catch (err: any) {
        const msg = err?.data?.error?.message ?? err?.message ?? String(err);
        const status = err?.status ?? err?.data?.status;

        console.log(`Attempt ${attempt} failed:`, msg, `(status: ${status})`);

        // If it's a 422 "Not between rounds", the server isn't ready yet
        if (
          status === 422 ||
          msg.toLowerCase().includes("not between rounds")
        ) {
          if (attempt < maxAttempts) {
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs = Math.min(3000, Math.round(delayMs * 1.5));
            continue;
          }
        }

        // For other errors, show error and stop retrying
        console.error("Failed to fetch round result:", err);
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

        // Check if results should be available
        if (
          gameState?.status === "between_rounds" ||
          gameState?.status === "round_ended" ||
          gameState?.status === "results_available"
        ) {
          console.log("Game state indicates results available, fetching...");
          await fetchResultsFromAPI();
          return;
        } else {
          // Not ready yet, poll again
          console.log(`Status is ${gameState?.status}, polling again in 2s...`);
          if (!cancelled) {
            pollTimer = setTimeout(pollGameState, 2000);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch game state:", err);
        if (!cancelled) {
          pollTimer = setTimeout(pollGameState, 3000);
        }
      }
    };

    // Start polling after a short delay to give WebSocket a chance
    const initialTimer = setTimeout(pollGameState, 1000);

    return () => {
      cancelled = true;
      isUnmountedRef.current = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (initialTimer) clearTimeout(initialTimer);
    };
  }, [gameCode, data]);

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
          <h2 className={styles.title}>
            Round {data.round_number ?? data.round} Complete!
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

        <div className={styles.waitingMessage}>
          Waiting for host to start the next round...
        </div>
      </div>
    </div>
  );
}
