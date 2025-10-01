import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import LoadingAnimation from "./loading_gray.json";
import styles from "./PlayerLobbyPage.module.css";

type LottieData = object;

export interface PlayerLobbyPageProps {
  message?: string;
  backgroundColor?: string;
  lottieUrl?: string;
}

function PlayerLobbyPage({
  message = "Waiting for other players...",
  backgroundColor = "#b11919ff",
  lottieUrl,
}: PlayerLobbyPageProps) {
  const [remoteLottie, setRemoteLottie] = useState<LottieData | null>(null);
  const lottieData = useMemo<LottieData>(() => remoteLottie ?? (LoadingAnimation as LottieData), [remoteLottie]);

  useEffect(() => {
      let isActive = true;
      if (!lottieUrl) return;
      (async () => {
        try {
          const response = await fetch(lottieUrl, { headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error(`Failed to load Lottie: ${response.status}`);
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
      style={{ backgroundColor }}
    >
      <p className={styles["lobby-message"]}>{message}</p>

      <div className={styles["lottie-container"]}>
        <Lottie animationData={lottieData} loop />
      </div>
    </div>
  );
};

export default PlayerLobbyPage;
