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
      try {
        const path = `/api/v1/games/${encodeURIComponent(gameCode)}/results`;
        const response = await http<GameResultsDTO>(path, { method: "GET" });
        setWinner(response.data.winner);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch results:", err);
        setError(err?.data?.error?.message ?? "Failed to load winner");
        setIsLoading(false);
      }
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
      title="🏆 SPRINGBOK CHAMPION 🏆"
      name={winner ?? "No Winner"}
      message={winner ? "Congratulations on your victory!" : "Game completed"}
      primaryColor="#FFB302"
      secondaryColor="#213A35"
      overlayOpacity={0.4}
      confettiPieces={300}
    />
  );
}
