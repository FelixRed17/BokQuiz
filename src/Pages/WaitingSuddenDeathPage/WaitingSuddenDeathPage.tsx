import { Suspense, lazy, useEffect, useState } from "react";
import styles from "./WaitingSuddenDeathPage.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { useGameChannel } from "../../hooks/useGameChannel";

const Lottie = lazy(() => import("lottie-react"));
type LottieData = object;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export interface WaitingSuddenDeathPageProps {
  message?: string;
  backgroundColor?: string;
  lottieUrl?: string;
}

function WaitingSuddenDeathPage({
  message = "Game is in Sudden Death",
  backgroundColor = "linear-gradient(135deg, #007A33 0%, #F4C300 100%)", 
  lottieUrl,
}: WaitingSuddenDeathPageProps) {
  const { code } = useParams<{ code: string }>();
  const gameCode = code ?? "";
  const navigate = useNavigate();
  const [lottieData, setLottieData] = useState<LottieData | null>(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        if (lottieUrl) {
          const response = await fetch(lottieUrl, {
            headers: { Accept: "application/json" },
          });
          if (!response.ok)
            throw new Error(`Failed to load Lottie: ${response.status}`);
          const json = (await response.json()) as LottieData;
          if (isActive) setLottieData(json);
          return;
        }

        const localAnimation = await import("./WaitingSuddenDeathPageLottie.json");
        if (isActive) setLottieData(localAnimation.default as LottieData);
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
      if (
        msg.type === "question_started" &&
        isRecord(msg.payload) &&
        msg.payload.round_number !== 4
      ) {
        // Next regular round started
        navigate(`/game/${encodeURIComponent(gameCode)}/question`, {
          state: { question: msg.payload },
        });
      }
    },
  });

  return (
    <div className={styles.wrapper} style={{ background: backgroundColor }}>
      <h1 className={styles.title}>{message}</h1>
      <div className={styles.lottieContainer}>
        {lottieData ? (
          <Suspense fallback={<div className={styles.lottieFallback} />}>
            <Lottie animationData={lottieData} loop />
          </Suspense>
        ) : (
          <div className={styles.lottieFallback} />
        )}
      </div>
    </div>
  );
}

export default WaitingSuddenDeathPage;
