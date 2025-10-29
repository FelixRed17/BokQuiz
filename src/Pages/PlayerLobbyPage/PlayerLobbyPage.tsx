import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import LoadingAnimation from "./Robot run.json";
import styles from "./PlayerLobbyPage.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useGameState } from "../AdminLobbyPage/hooks/useGameState";
import { useGameChannel } from "../../hooks/useGameChannel";

type LottieData = object;

export interface PlayerLobbyPageProps {
  message?: string;
  backgroundColor?: string;
  lottieUrl?: string;
}

function PlayerLobbyPage({
  message = "Waiting for game to start...",
  backgroundColor = "linear-gradient(to top, #0C081A, #4800a7ff)",
  lottieUrl,
}: PlayerLobbyPageProps) {
  const [remoteLottie, setRemoteLottie] = useState<LottieData | null>(null);
  
  const lottieData = useMemo<LottieData>(
    () => remoteLottie ?? (LoadingAnimation as LottieData),
    [remoteLottie]
  );

  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const { state, reload } = useGameState(gameCode, { pollIntervalMs: 3000 });
  const amHost = localStorage.getItem("amHost") === "true";

  useGameChannel(gameCode, {
    onConnected: () => {
      console.log("WS connected for game", gameCode);
      reload();
    },
    onMessage: (msg) => {
      console.log("GameChannel message:", msg);
      if (!msg?.type) return;
      
      if (msg.type === "question_started") {
        console.log("Received question_started broadcast. Navigating to quiz.");
        navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
          state: { question: msg.payload },
        });
      }
      
      if (
        msg.type === "player_joined" ||
        msg.type === "player_ready" ||
        msg.type === "player_renamed"
      ) {
        reload();
      }
    },
  });

  useEffect(() => {
    if (!state) return;
    console.log(
      `Polling state update: status=${state.status}, amHost=${amHost}`
    );
    
    if (state.status !== "lobby") {
      console.log(
        `Game status changed to ${state.status}. Navigating to quiz.`
      );
      navigate(`/game/${encodeURIComponent(gameCode)}/question`);
    }
  }, [state?.status, gameCode, navigate, amHost]);

  useEffect(() => {
    let isActive = true;
    if (!lottieUrl) return;
    
    (async () => {
      try {
        const response = await fetch(lottieUrl, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok)
          throw new Error(`Failed to load Lottie: ${response.status}`);
        const json = (await response.json()) as LottieData;
        if (isActive) setRemoteLottie(json);
      } catch (error) {
        console.warn(error);
      }
    })();
    
    return () => {
      isActive = false;
    };
  }, [lottieUrl]);

  return (
    <div 
      className={styles["player-lobby"]} 
      style={{ background: backgroundColor }}
    >
      <p className={styles["lobby-message"]}>{message}</p>
      <div className={styles["lottie-container"]}>
        <Lottie animationData={lottieData} loop />
      </div>
    </div>
  );
}

export default PlayerLobbyPage;