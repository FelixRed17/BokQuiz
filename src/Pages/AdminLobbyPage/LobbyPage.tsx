import { useParams } from "react-router-dom";
import styles from "./LobbyPage.module.css";
import { useGameState } from "./hooks/useGameState";
import { useNavigate } from "react-router-dom";
import { hostStart } from "./services/games.service";
import { useGameChannel } from "../../hooks/useGameChannel";

function LobbyScreen() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();

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

  const totalPlayers = players.length;
  const readyCount = players.filter((p) => p.ready).length;
  const eliminatedCount = players.filter((p) => p.eliminated).length;

  const handleStartGame = async () => {
    if (!gameCode) return;
    const hostToken = localStorage.getItem("hostToken");
    if (!hostToken) {
      console.error(
        "Host token missing. Create a game or set host token in localStorage."
      );
      return;
    }

    try {
      await hostStart(gameCode, hostToken);
      // Don't navigate here - the WebSocket message handler will navigate when question_started arrives
    } catch (err: any) {
      const msg =
        err?.data?.error?.message ?? err?.message ?? "Failed to start game";
      console.error(`Failed to start game: ${msg}`);
    }
  };

  return (
    <div
      className={`min-vh-100 d-flex align-items-center justify-content-center p-4 ${styles.pageBg}`}
    >
      <div className={`p-4 w-100 shadow-lg ${styles.cardShell}`}>
        {/* Header */}
        <div className="d-flex align-items-center mb-4">
          <div
            className={`d-flex align-items-center justify-content-center me-3 border border-4 ${styles.logoCircle}`}
          >
            <div className="text-dark fw-bold fs-4">🏉</div>
          </div>
          <div>
            <h1 className={`fw-bold mb-2 ${styles.title}`}>
              Springbok Quiz – Admin Lobby
            </h1>
            <p className={`text-light fs-5 mb-0 ${styles.subtitle}`}>
              Manage players and start the match
            </p>
          </div>
        </div>

        {/* Header / Code */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className={`${styles.playersHeader}`}>PLAYER</h2>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>CODE: </span>
            <span className={styles.codeValue}>{gameCode || "—"}</span>
          </div>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="mb-3">
            <small className="text-muted">Loading lobby…</small>
          </div>
        )}
        {error && (
          <div className="mb-3">
            <small className="text-danger">Error: {error}</small>
          </div>
        )}

        {/* Players */}
        <div className="mb-4">
          <div className="d-flex flex-column gap-3">
            {players.length === 0 && !isLoading && (
              <div className="text-muted">No players yet.</div>
            )}

            {players.map((p) => (
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
                  <span className="text-dark fw-semibold fs-5">{p.name}</span>
                </div>

                <div className="d-flex align-items-center gap-3">
                  {p.eliminated ? (
                    <span className="badge bg-danger">Eliminated</span>
                  ) : p.ready ? (
                    <span className="badge bg-success">Ready</span>
                  ) : (
                    <span className="badge bg-secondary">Not Ready</span>
                  )}

                  <button
                    className="btn btn-outline-success fw-semibold px-3 py-2"
                    disabled
                  >
                    Kick
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="d-flex justify-content-between mb-4 text-white">
          <div className="text-center">
            <div className={styles.statTitle}>TOTAL</div>
            <div className={styles.statValue}>{totalPlayers}</div>
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
            disabled={(state?.status ?? "lobby") !== "lobby"}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
