import { useState } from "react";
import { useParams } from "react-router-dom";
import styles from "./LobbyPage.module.css";
import { useGameState } from "./hooks/useGameState";
import { useNavigate } from "react-router-dom";
import { fetchQuestion, hostStart } from "./services/games.service";
import { useGameChannel } from "../../hooks/useGameChannel";

function LobbyScreen() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);

  const { state, isLoading, error } = useGameState(gameCode, {
    pollIntervalMs: 3000,
  });

  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "question_started") {
        console.log("Host received question_started. Navigating to host view.");
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question: msg.payload },
        });
      }
    },
  });

  const players = state?.players ?? [];
  const admin = players.find((p) => p.isHost);
  const joinedPlayers = players.filter((p) => !p.isHost);
  const maxPlayers = 8;

  const totalPlayers = joinedPlayers.length;
  const readyCount = joinedPlayers.filter((p) => p.ready).length;
  const eliminatedCount = joinedPlayers.filter((p) => p.eliminated).length;

  const handleStartGame = async () => {
    if (!gameCode || isStarting) return;
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error(
        "Host token missing. Create a game or set host token in localStorage."
      );
      return;
    }

    try {
      setIsStarting(true);
      await hostStart(gameCode, hostToken);

      try {
        const question = await fetchQuestion(gameCode);
        navigate(`/game/${encodeURIComponent(gameCode)}/host`, {
          state: { question },
        });
      } catch {
        navigate(`/game/${encodeURIComponent(gameCode)}/host`);
      }
    } catch (err: unknown) {
      const error = err as {
        data?: { error?: { message?: unknown } };
        message?: unknown;
      };
      const msg =
        (typeof error.data?.error?.message === "string"
          ? error.data.error.message
          : undefined) ??
        (typeof error.message === "string" ? error.message : undefined) ??
        "Failed to start game";
      console.error(`Failed to start game: ${msg}`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div
      className={`min-vh-100 d-flex align-items-center justify-content-center p-4 ${styles.pageBg}`}
    >
      <div className={`p-4 w-100 shadow-lg ${styles.cardShell}`}>
        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          {/* <div
            className={`d-flex align-items-center justify-content-center me-3 ${styles.logoCircle}`}
          >
            <div className="fw-bold fs-4 text-white"></div>
          </div> */}
          <div>
            <h1 className={`fw-bold mb-2 ${styles.title}`}>
              AI Quiz – Admin Lobby
            </h1>
            <p className={`fs-5 mb-0 ${styles.subtitle}`}>
              Manage players and start the match
            </p>
          </div>
        </div>

        {/* Header / Code */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className={`${styles.playersHeader}`}>PLAYERS</h2>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>CODE: </span>
            <span className={styles.codeValue}>{gameCode || "—"}</span>
          </div>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="mb-3 text-info">
            <small>Loading lobby…</small>
          </div>
        )}
        {error && (
          <div className="mb-3 text-danger">
            <small>Error: {error}</small>
          </div>
        )}

        {/* Players */}
        <div className="mb-4">
          <div className="d-flex flex-column gap-3">
            {admin && (
              <div
                className={`d-flex align-items-center justify-content-between ${styles.playerItem}`}
              >
                <div className="d-flex align-items-center">
                  <div className={`me-3 ${styles.statusDot} ${styles.statusOnline}`} />
                  <span className="fw-semibold fs-5 text-light">
                    {admin.name}
                  </span>
                </div>

                <span
                  className="px-3 py-1"
                  style={{
                    background: "linear-gradient(90deg, #F4C300, #007A33)",
                    borderRadius: "0.5rem",
                    color: "#0C081A",
                    fontWeight: 700,
                    boxShadow: "0 0 10px rgba(244,195,0,0.45)",
                  }}
                >
                  Admin
                </span>
              </div>
            )}

            {joinedPlayers.length === 0 && !isLoading && (
              <div className="text-muted">No players yet.</div>
            )}

            {joinedPlayers.map((p) => (
              <div
                key={p.name}
                className={`d-flex align-items-center justify-content-between ${styles.playerItem}`}
              >
                <div className="d-flex align-items-center">
                  <div
                    className={`me-3 ${styles.statusDot} ${
                      p.eliminated ? styles.statusOffline : styles.statusOnline
                    }`}
                  />
                  <span className="fw-semibold fs-5 text-light">{p.name}</span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  {p.eliminated ? (
                    <span
                      className="px-3 py-1"
                      style={{
                        background: "linear-gradient(90deg, #F64B4B, #B00020)",
                        borderRadius: "0.5rem",
                        color: "#fff",
                        fontWeight: 600,
                        boxShadow: "0 0 10px rgba(246,75,75,0.6)",
                      }}
                    >
                      Eliminated
                    </span>
                  ) : p.ready ? (
                    <span
                      className="px-3 py-1"
                      style={{
                        background: "linear-gradient(90deg, #F4C300, #007A33)",
                        borderRadius: "0.5rem",
                        color: "#0C081A",
                        fontWeight: 700,
                        boxShadow: "0 0 10px rgba(48,213,200,0.6)",
                      }}
                    >
                      Ready
                    </span>
                  ) : (
                    <span
                      className="px-3 py-1"
                      style={{
                        background: "linear-gradient(90deg, #444, #666)",
                        borderRadius: "0.5rem",
                        color: "#EAEAEA",
                        fontWeight: 600,
                        boxShadow: "0 0 6px rgba(255,255,255,0.2)",
                      }}
                    >
                      Not Ready
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="d-flex justify-content-between mb-4 text-white">
          <div className="text-center">
            <div className={styles.statTitle}>TOTAL</div>
            <div className={styles.statValue}>
              {totalPlayers}/{maxPlayers}
            </div>
          </div>
          <div className="text-center">
            <div className={styles.statTitle}>ONLINE</div>
            <div className={styles.statValue}>
              {totalPlayers - eliminatedCount}
            </div>
          </div>
          <div className="text-center">
            <div className={styles.statTitle}>READY</div>
            <div className={styles.statValue}>{readyCount}</div>
          </div>
        </div>

        {/* Start */}
        <div className="d-flex justify-content-center">
          <button
            onClick={handleStartGame}
            className={`shadow ${styles.startBtn}`}
            disabled={isStarting || (state?.status ?? "lobby") !== "lobby"}
          >
            {isStarting ? "Starting..." : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
