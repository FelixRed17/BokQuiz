import React, { useState } from "react";
import styles from "./LobbyScreen.module.css";

interface Player {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeen?: string;
}

function LobbyScreen() {
  const [players, setPlayers] = useState<Player[]>([
    { id: "1", name: "Thabo", status: "online" },
    { id: "2", name: "Lerato", status: "online" },
    { id: "3", name: "Sipho", status: "offline", lastSeen: "45s ago" },
    { id: "4", name: "Aisha", status: "online" },
  ]);

  const handleKickPlayer = (playerId: string) => {
    setPlayers(players.filter((player) => player.id !== playerId));
  };

  const handleStartGame = () => {
    alert("Starting the quiz game!");
  };

  const onlinePlayers = players.filter(
    (player) => player.status === "online"
  ).length;
  const readyPlayers = players.filter(
    (player) => player.status === "online"
  ).length; // Assuming online players are ready

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
              Springbok Quiz — Admin Lobby
            </h1>
            <p className={`text-light fs-5 mb-0 ${styles.subtitle}`}>
              Manage players and start the match
            </p>
          </div>
        </div>

        {/* Player Header and Game Code */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className={`${styles.playersHeader}`}>PLAYER</h2>
          <div className={styles.codeBox}>
            <span className={styles.codeLabel}>CODE: </span>
            <span className={styles.codeValue}>BOK-7321</span>
          </div>
        </div>

        {/* Players List */}
        <div className="mb-4">
          <div className="d-flex flex-column gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`d-flex align-items-center justify-content-between ${styles.playerItem}`}
              >
                <div className="d-flex align-items-center">
                  <div
                    className={`me-3 ${styles.statusDot} ${
                      player.status === "online"
                        ? styles.statusOnline
                        : styles.statusOffline
                    }`}
                  ></div>
                  <span className="text-dark fw-semibold fs-5">
                    {player.name}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-dark fw-medium">
                    {player.status === "online" ? "Online" : player.lastSeen}
                  </span>
                  <button
                    onClick={() => handleKickPlayer(player.id)}
                    className="btn btn-outline-success fw-semibold px-3 py-2"
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
            <div className={styles.statValue}>{players.length}</div>
          </div>
          <div className="text-center">
            <div className={styles.statTitle}>ONLINE</div>
            <div className={styles.statValue}>{onlinePlayers}</div>
          </div>
          <div className="text-center">
            <div className={styles.statTitle}>READY</div>
            <div className={styles.statValue}>{readyPlayers}</div>
          </div>
        </div>

        {/* Start Button */}
        <div className="d-flex justify-content-center">
          <button
            onClick={handleStartGame}
            className={`shadow ${styles.startBtn}`}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

export default LobbyScreen;
