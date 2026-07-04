import React, { Suspense, lazy, useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate } from "react-router-dom";
import backgroundImg from "./BackgroundImage.optimized.jpg";
import backgroundVideoUrl from "./BackgroundVideo.mov";
import trophyAnimationUrl from "./Trophy.lottie?url";
import "./WinnerScreen.css";

const Confetti = lazy(() => import("react-confetti"));
const WINNER_NAME_REVEAL_SECONDS = 5;

export interface WinnerScreenProps {
  title?: string;
  name?: string;
  message?: string;
  textColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  background?: string; // image URL
  backgroundVideo?: string; // video URL
  overlayOpacity?: number; // 0..1
  confettiPieces?: number;
  lottieUrl?: string; // remote Lottie JSON or dotLottie URL
}

const WinnerScreen: React.FC<WinnerScreenProps> = ({
  title = "WINNER",
  name,
  message,
  textColor = "#EAEAEA",
  primaryColor = "#007A33",
  secondaryColor = "#F4C300",
  background,
  backgroundVideo,
  overlayOpacity = 0.3,
  confettiPieces = 200,
  lottieUrl,
}) => {
  const navigate = useNavigate();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [showWinnerName, setShowWinnerName] = useState(false);

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

  useEffect(() => {
    setShowWinnerName(false);
    const fallbackTimer = window.setTimeout(() => {
      setShowWinnerName(true);
    }, WINNER_NAME_REVEAL_SECONDS * 1000 + 500);

    return () => window.clearTimeout(fallbackTimer);
  }, [name, backgroundVideo]);

  const backgroundImageUrl =
    background && background.trim().length > 0
      ? background.trim()
      : backgroundImg;
  const videoUrl =
    backgroundVideo && backgroundVideo.trim().length > 0
      ? backgroundVideo.trim()
      : backgroundVideoUrl;
  const animationUrl =
    lottieUrl && lottieUrl.trim().length > 0
      ? lottieUrl.trim()
      : trophyAnimationUrl;

  const styleVars = {
    "--primary": primaryColor,
    "--secondary": secondaryColor,
    "--overlay-opacity": Math.min(Math.max(overlayOpacity, 0), 1).toString(),
    "--bg-image": `url(${backgroundImageUrl})`,
  } as React.CSSProperties;

  const handleVideoTimeUpdate = (
    event: React.SyntheticEvent<HTMLVideoElement>
  ) => {
    if (
      !showWinnerName &&
      event.currentTarget.currentTime >= WINNER_NAME_REVEAL_SECONDS
    ) {
      setShowWinnerName(true);
    }
  };

  return (
    <div className="winner-container" style={styleVars}>
      <video
        className="winner-background-video"
        src={videoUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onTimeUpdate={handleVideoTimeUpdate}
      />
      <div className="overlay" />

      <Suspense fallback={null}>
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          colors={[primaryColor, secondaryColor]}
          recycle={showWinnerName}
          run={showWinnerName}
          numberOfPieces={showWinnerName ? confettiPieces : 0}
          style={{ zIndex: 3, pointerEvents: "none" }}
        />
      </Suspense>

      <div className="title-block">
        <div className="title" style={{ color: textColor }}>
          {title}
        </div>
        {message ? <div className="message">{message}</div> : null}

        <div>
          {name && showWinnerName ? <div className="name">{name}</div> : null}
        </div>
      </div>

      <div className="lottie-wrapper">
        <DotLottieReact
          src={animationUrl}
          loop
          autoplay
          className="winner-lottie"
        />
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
