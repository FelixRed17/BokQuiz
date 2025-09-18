import React, { useEffect, useMemo, useState } from "react";
import Lottie from "lottie-react";
import Confetti from "react-confetti";
import trophyAnimation from "./Trophy.json";
import backgroundImg from "./BackgroundImage.png";
import "./WinnerScreen.css";

type LottieData = object;

export interface WinnerScreenProps {
  title?: string;
  name?: string;
  message?: string;
  primaryColor?: string;
  secondaryColor?: string;
  background?: string; // image URL
  overlayOpacity?: number; // 0..1
  confettiPieces?: number;
  lottieUrl?: string; // remote Lottie JSON URL
}

const WinnerScreen: React.FC<WinnerScreenProps> = ({
  title = "WINNER",
  name,
  message,
  primaryColor = "#FFB302",
  secondaryColor = "#213A35",
  background,
  overlayOpacity = 0.3,
  confettiPieces = 200,
  lottieUrl,
}) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [remoteLottie, setRemoteLottie] = useState<LottieData | null>(null);
  const lottieData = useMemo<LottieData>(() => remoteLottie ?? (trophyAnimation as LottieData), [remoteLottie]);

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Optionally load remote Lottie JSON
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
        // eslint-disable-next-line no-console
        console.warn(error);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [lottieUrl]);

  const backgroundImageUrl = background && background.trim().length > 0 ? background.trim() : backgroundImg;

  const styleVars = {
    "--primary": primaryColor,
    "--secondary": secondaryColor,
    "--overlay-opacity": Math.min(Math.max(overlayOpacity, 0), 1).toString(),
    "--bg-image": `url(${backgroundImageUrl})`,
  } as React.CSSProperties;

  return (
    <div className="winner-container" style={styleVars}>
      <div className="overlay" />

      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        colors={[primaryColor, secondaryColor]}
        recycle={true}
        numberOfPieces={confettiPieces}
      />

      <div className="title-block">
        <div className="title" style={{ color: primaryColor }}>{title}</div>
        {name ? <div className="name">{name}</div> : null}
        {message ? <div className="message">{message}</div> : null}
      </div>

      <div className="lottie-wrapper">
        <Lottie animationData={lottieData} loop={true} />
      </div>
    </div>
  );
};

export default WinnerScreen;
