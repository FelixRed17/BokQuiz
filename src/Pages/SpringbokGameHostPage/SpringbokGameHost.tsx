import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SpringbokGameHost.module.css";
import { useCreateGame } from "./hooks/useCreateGame";

export default function SpringbokGameHost() {
  const [hostName, setHostName] = useState("");
  const { isLoading, error, data, createGame } = useCreateGame();
  const navigate = useNavigate();

  // inside SpringbokGameHost.tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const game = await createGame(hostName);
    if (game) {
      // Persist host credentials so Start can use them later
      localStorage.setItem("hostToken", game.hostToken);
      localStorage.setItem("hostPlayerId", String(game.hostPlayerId));
      localStorage.setItem("gameCode", game.code);
      localStorage.setItem("amHost", "true");

      // Go to lobby with the real code in the URL
      navigate(`/lobby/${game.code}`);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div
      className={`${styles.container} d-flex align-items-center justify-content-center p-3`}
    >
      <div className={`${styles.card} w-100`}>
        <div className={styles.header}>
          <span className={styles.springbokIcon}>🤖</span>
          <h2 className="mb-0">AI Game Host</h2>
          <p className="mb-0 mt-2" style={{ opacity: 0.9 }}>
            Create your game session
          </p>
        </div>

        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="hostName">
                Host Name
              </label>
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className={styles.input}
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !hostName.trim()}
              className={styles.button}
            >
              {isLoading ? (
                <>
                  <span className={styles.spinner} />
                  <span style={{ marginLeft: 8 }}>Creating Game...</span>
                </>
              ) : (
                "Create Game Session"
              )}
            </button>
          </form>

          {data && (
            <div className={styles.successCard}>
              <h5 className="text-success mb-3">
                🎉 Game Created Successfully!
              </h5>
              <div className={styles.responseItem}>
                <span>
                  <strong>Game Code:</strong>
                </span>
                <div className="d-flex align-items-center">
                  <span className={styles.badge}>{data.code}</span>
                  <button
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(data.code)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className={styles.errorCard}>
              <h6 className="text-danger mb-2">❌ Error</h6>
              <p className="text-danger mb-0">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
