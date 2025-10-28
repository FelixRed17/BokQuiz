import "./CountDown.css";
import { useEffect, useState } from "react";

type Props = {
  seconds?: number;
  onComplete?: () => void;
};

export default function CountDown({ seconds = 3, onComplete }: Props) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(seconds);

  useEffect(() => {
    setSecondsRemaining(seconds);
    const intervalId = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [seconds]);

  useEffect(() => {
    if (secondsRemaining === 0) {
      onComplete?.();
    }
  }, [secondsRemaining, onComplete]);

  return (
    <div className="countdown-container">
      <video
        className="countdown-bg-video"
        src="/purplebackground.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="countdown-card">
        <div className="countdown-header">
          <div className="countdown-header-icon">🤖</div>
          <h1 className="countdown-heading">AI Quiz</h1>
        </div>

        <p className="next-round">NEXT ROUND</p>
        <hr className="countdown-divider" />

        <div className="countdown">{secondsRemaining}</div>
        <div className="begins-in">Begins In</div>
      </div>
    </div>
  );
}
