// src/Pages/EliminatedPage/EliminatedPage.tsx
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

export default function EliminatedPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const playerName =
    sessionStorage.getItem("playerName") ?? localStorage.getItem("playerName");

  // Optional: prevent back navigation by replacing history entry whenever this page loads
  useEffect(() => {
    // If playerName is missing, send them home
    if (!playerName) {
      navigate("/", { replace: true });
    }

    // Replace current history entry so back navigations don't return to the game screens
    // (user can always click Back to Home manually)
    // This is light protection — not foolproof.
    window.history.replaceState({}, document.title, window.location.href);
  }, [playerName, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 30%, rgba(244, 195, 0, 0.18), transparent 34%), linear-gradient(135deg, #021003, #007A33)",
        color: "#fff",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          textAlign: "center",
          background: "rgba(0, 122, 51, 0.88)",
          padding: 28,
          borderRadius: 12,
          border: "2px solid rgba(244, 195, 0, 0.72)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.45), 0 0 42px rgba(244,195,0,0.28)",
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>You were eliminated</h1>
        <p style={{ color: "#d6d6d6", marginBottom: 24 }}>
          Sorry <strong>{playerName ?? "player"}</strong> — you've been
          eliminated from the competition. Thank you for playing!
        </p>

        <p style={{ color: "#bdbdbd", marginBottom: 16 }}>
          You can watch the rest of the game from the spectator screen or return
          to the lobby.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={() =>
              navigate(`/game/${encodeURIComponent(code ?? "")}/winner`)
            }
            style={{
              padding: "10px 18px",
              background: "#F4C300",
              color: "#10251F",
              border: "none",
              borderRadius: 8,
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            View Final Winner
          </button>

          <button
            onClick={() => {
              // Optionally clear playerName to let them rejoin later
              // sessionStorage.removeItem("playerName");
              navigate("/");
            }}
            style={{
              padding: "10px 18px",
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(244,195,0,0.55)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
