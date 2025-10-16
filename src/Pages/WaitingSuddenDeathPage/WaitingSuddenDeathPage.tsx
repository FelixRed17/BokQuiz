import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import LoadingAnimation from "./WaitingSuddenDeathPageLottie.json";
import styles from "./WaitingSuddenDeathPage.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { useGameChannel } from "../../hooks/useGameChannel";

type LottieData = object;

export interface WaitingSuddenDeathPageProps {
  message?: string;
  backgroundColor?: string;
  lottieUrl?: string;
}

function WaitingSuddenDeathPage({
  message = "Game is in Sudden Death",
  backgroundColor = "#1B3838", 
  lottieUrl,
}: WaitingSuddenDeathPageProps) {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const [remoteLottie, setRemoteLottie] = useState<LottieData | null>(null);

  const lottieData = useMemo<LottieData>(
    () => remoteLottie ?? (LoadingAnimation as LottieData),
    [remoteLottie]
  );

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

  // Listen for game events to exit waiting when SD ends
  useGameChannel(gameCode, {
    onMessage: (msg) => {
      if (msg.type === "round_ended" || msg.type === "sudden_death_eliminated") {
        navigate(`/game/${encodeURIComponent(gameCode)}/round-result`);
      }
      if (msg.type === "game_finished") {
        navigate(`/game/${encodeURIComponent(gameCode)}/winner`);
      }
      if (msg.type === "question_started" && msg?.payload?.round_number !== 4) {
        // Next regular round started
        navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
          state: { question: msg.payload },
        });
      }
    },
  });

  return (
    <div className={styles.wrapper} style={{ backgroundColor }}>
      <h1 className={styles.title}>{message}</h1>
      <div className={styles.lottieContainer}>
        <Lottie animationData={lottieData} loop />
      </div>
    </div>
  );
}

export default WaitingSuddenDeathPage;
