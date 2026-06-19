import React, { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImg from "./BackgroundImage.optimized.jpg";
import "./WinnerScreen.css";

const Lottie = lazy(() => import("lottie-react"));
const Confetti = lazy(() => import("react-confetti"));
type LottieData = object;

export interface WinnerScreenProps {
  title?: string;
  name?: string;
  message?: string;
  textColor?: string;
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
  textColor = "#EAEAEA",
  primaryColor = "#007A33",
  secondaryColor = "#F4C300",
  background,
  overlayOpacity = 0.3,
  confettiPieces = 200,
  lottieUrl,
}) => {
  const navigate = useNavigate();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [lottieData, setLottieData] = useState<LottieData | null>(null);

  const handleReturnHome = () => {
    navigate("/");
  };

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

        const localAnimation = await import("./Trophy.json");
        if (isActive) setLottieData(localAnimation.default as LottieData);
      } catch (error) {
        console.warn(error);
      }
    })();
    return () => {
      isActive = false;
    };
  }, [lottieUrl]);

  const backgroundImageUrl =
    background && background.trim().length > 0
      ? background.trim()
      : backgroundImg;

  const styleVars = {
    "--primary": primaryColor,
    "--secondary": secondaryColor,
    "--overlay-opacity": Math.min(Math.max(overlayOpacity, 0), 1).toString(),
    "--bg-image": `url(${backgroundImageUrl})`,
  } as React.CSSProperties;

  return (
    <div className="winner-container" style={styleVars}>
      <div className="overlay" />

      <Suspense fallback={null}>
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          colors={[primaryColor, secondaryColor]}
          recycle={true}
          numberOfPieces={confettiPieces}
        />
      </Suspense>

      <div className="title-block">
        <div className="title" style={{ color: textColor }}>
          {title}
        </div>
        {message ? <div className="message">{message}</div> : null}

        <div>{name ? <div className="name">{name}</div> : null}</div>
      </div>

      <div className="lottie-wrapper">
        {lottieData ? (
          <Suspense fallback={<div className="lottie-placeholder" />}>
            <Lottie animationData={lottieData} loop={true} />
          </Suspense>
        ) : (
          <div className="lottie-placeholder" />
        )}
      </div>

      {/* Home Button */}
      <div className="home-button-container">
        <button 
          className="home-button"
          onClick={handleReturnHome}
        >
          🏠 Return to Home
        </button>
      </div>
    </div>
  );
};

export default WinnerScreen;
