import GameTimerPanel from "../../../components/GameTimerPanel/GameTimerPanel";

interface TimerProps {
  timeLeft: number;
  className?: string;
}

export default function Timer({ timeLeft, className = "" }: TimerProps) {
  return (
    <GameTimerPanel
      timeLeft={timeLeft}
      className={`player-game-timer ${className}`.trim()}
    />
  );
}
