import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import WinnerScreen from "./WinnerScreen";
import { http } from "../../lib/http";

type GameResultsDTO = {
  data: {
    winner: string | null;
    answers: Array<{
      round: number;
      text: string;
      correct_index: number;
    }>;
  };
};

export default function WinnerPage() {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const [winner, setWinner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const path = `/api/v1/games/${encodeURIComponent(gameCode)}/results`;
      const maxAttempts = 10;
      let attempt = 0;
      let delayMs = 400;
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          const response = await http<GameResultsDTO>(path, { method: "GET", cache: "no-store" });
          setWinner(response.data.winner);
          setIsLoading(false);
          return;
        } catch (err: any) {
          const status = err?.status ?? err?.response?.status;
          const msg = err?.data?.error?.message ?? err?.message ?? String(err);
          console.warn(`Winner fetch failed (attempt ${attempt}/${maxAttempts}):`, msg, `(status: ${status})`);
          // If results not ready (422/404), backoff with jitter and retry
          if (
            status === 422 ||
            status === 404 ||
            (typeof msg === "string" && msg.toLowerCase().includes("not between rounds"))
          ) {
            if (attempt < maxAttempts) {
              const jitter = Math.floor(Math.random() * 300);
              const wait = delayMs + jitter;
              await new Promise((res) => setTimeout(res, wait));
              delayMs = Math.min(3000, Math.round(delayMs * 1.5));
              continue;
            }
          }
          setError(msg);
          setIsLoading(false);
          return;
        }
      }
      // Exhausted attempts
      setError("Winner results not ready yet. Please try again shortly.");
      setIsLoading(false);
    };

    if (gameCode) {
      fetchResults();
    }
  }, [gameCode]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#213A35",
        }}
      >
        <div style={{ color: "#FFB302", fontSize: "24px" }}>
          Loading results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#213A35",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div style={{ color: "#FFB302", fontSize: "24px" }}>Error: {error}</div>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "12px 24px",
            background: "#FFB302",
            color: "#213A35",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <WinnerScreen
      title="🏆BokQuiz CHAMPION 🏆"
      message={winner ? "Congratulations on your victory!" : "Game completed"}
       name={winner ?? "No Winner"}
      primaryColor="#FFB302"
      secondaryColor="#213A35"
      overlayOpacity={0.4}
      confettiPieces={300}
    />
  );
}
