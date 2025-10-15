import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRoundResult,
  fetchGameState,
} from "../AdminLobbyPage/services/games.service";
import type { RoundResultData } from "../AdminLobbyPage/services/games.service";
import { useGameChannel } from "../../hooks/useGameChannel";
import styles from "./PlayerRoundResultPage.module.css";

export default function PlayerRoundResultPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

  const [data, setData] = useState<RoundResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>("");

  const hasFetchedRef = useRef(false);
  const isUnmountedRef = useRef(false);

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

        const roundNum = payload.round_number ?? payload.round ?? 1;

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

        console.log("Broadcast incomplete, fetching from API...");
        fetchResultsFromAPI();
      }
    },
  });

  useEffect(() => {
    const storedName =
      sessionStorage.getItem("playerName") ??
      localStorage.getItem("playerName") ??
      "";
    setPlayerName(storedName);
  }, []);

  const fetchResultsFromAPI = async () => {
    if (hasFetchedRef.current || isUnmountedRef.current) return;

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

        setData(rr);
        setIsLoading(false);
        setError(null);
        hasFetchedRef.current = true;
        return;
      } catch (err: any) {
        const msg = err?.data?.error?.message ?? err?.message ?? String(err);
        const status = err?.status ?? err?.data?.status;

        console.log(`Attempt ${attempt} failed:`, msg, `(status: ${status})`);

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

        if (!isUnmountedRef.current && !data) {
          setError(msg);
          setIsLoading(false);
        }
        return;
      }
    }

    if (!isUnmountedRef.current && !data) {
      console.error("Exhausted all retry attempts");
      setError("Unable to load results after multiple attempts");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isUnmountedRef.current = false;

    if (data || hasFetchedRef.current) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const pollGameState = async () => {
      if (cancelled || hasFetchedRef.current) return;

      try {
        console.log("Polling game state...");
        const gameState = await fetchGameState(gameCode);

        if (cancelled) return;

        if (
          gameState?.status === "between_rounds" ||
          gameState?.status === "round_ended" ||
          gameState?.status === "results_available"
        ) {
          console.log("Game state indicates results available, fetching...");
          await fetchResultsFromAPI();
          return;
        } else {
          console.log(`Status is ${gameState?.status}, polling again in 2s...`);
          if (!cancelled) pollTimer = setTimeout(pollGameState, 2000);
        }
      } catch (err) {
        console.warn("Failed to fetch game state:", err);
        if (!cancelled) pollTimer = setTimeout(pollGameState, 3000);
      }
    };

    const initialTimer = setTimeout(pollGameState, 1000);

    return () => {
      cancelled = true;
      isUnmountedRef.current = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (initialTimer) clearTimeout(initialTimer);
    };
  }, [gameCode, data]);

  if (isLoading)
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

  if (error)
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

  if (!data)
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

  const isEliminated = data.eliminated_names.includes(playerName);
  const topThree = data.leaderboard.slice(0, 3);
  const playerRank =
    data.leaderboard.findIndex((e) => e.name === playerName) + 1;

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
        <div className={styles.header}>
          <div className={styles.headerIcon}>🏉</div>
          <h2 className={styles.title}>Round {data.round_number} Complete!</h2>
        </div>

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
