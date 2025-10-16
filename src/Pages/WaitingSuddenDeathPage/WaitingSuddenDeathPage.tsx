import { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import LoadingAnimation from "./WaitingSuddenDeathPageLottie.json";
import styles from "./WaitingSuddenDeathPage.module.css";

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
