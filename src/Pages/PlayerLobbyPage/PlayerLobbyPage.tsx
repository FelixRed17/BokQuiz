import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import LoadingAnimation from "./loading_gray.json";
import styles from "./PlayerLobbyPage.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { useGameState } from "../AdminLobbyPage/hooks/useGameState";
import { useGameChannel } from "../../hooks/useGameChannel"; // path adjust

type LottieData = object;

export interface PlayerLobbyPageProps {
  message?: string;
  backgroundColor?: string;
  lottieUrl?: string;
}

function PlayerLobbyPage({
  message = "Waiting for game to start...",
  backgroundColor = "#1B3838",
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

  const { state, isLoading, error, reload } = useGameState(gameCode, {
    pollIntervalMs: 3000,
  });

  // determine whether this client is host (we persist hostToken at create time)
  const hostToken = localStorage.getItem("hostToken");
  const amHost = Boolean(hostToken);

  // subscribe to game channel and handle messages
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      // message shape: { type: 'question_started', payload: { ... } } as your server sends
      if (!msg || !msg.type) return;

      // If the server told "question_started" — only players should navigate
      if (msg.type === "question_started") {
        if (!amHost) {
          // navigate players to the quiz page
          navigate(`/game/${encodeURIComponent(gameCode)}/question`);
        } else {
          // host: do nothing here, host already navigates locally after calling host_start
        }
      }

      // you can handle other event types:
      // if (msg.type === 'player_joined') { reload(); }
      // if (msg.type === 'player_ready') { reload(); }
    },
    onConnected: () => {
      // optional: reload now that live connection is available
      reload();
    },
  });

  // also keep the state-based fallback: if the state changes to not 'lobby' (e.g., if subscription missed), redirect players
  useEffect(() => {
    if (!state) return;
    if (state.status !== "lobby" && !amHost) {
      navigate(`/game/${encodeURIComponent(gameCode)}/question`);
    }
  }, [state?.status, amHost, gameCode, navigate]);

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
    <div className={styles["player-lobby"]} style={{ backgroundColor }}>
      <p className={styles["lobby-message"]}>{message}</p>

      <div className={styles["lottie-container"]}>
        <Lottie animationData={lottieData} loop />
      </div>
    </div>
  );
}

export default PlayerLobbyPage;
