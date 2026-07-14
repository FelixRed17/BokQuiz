import "./GameTimerPanel.css";

type GameTimerPanelProps = {
  timeLeft: number;
  className?: string;
};

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function GameTimerPanel({
  timeLeft,
  className = "",
}: GameTimerPanelProps) {
  const isUrgent = timeLeft > 0 && timeLeft <= 5;

  return (
    <div
      className={`game-timer-panel ${isUrgent ? "is-urgent" : ""} ${className}`.trim()}
    >
      <div className="game-timer-section">
        <span className="game-timer-label">TIME:</span>
        <div className={`game-timer-clock-box ${isUrgent ? "is-urgent" : ""}`}>
          <span className={`game-timer-clock ${isUrgent ? "is-urgent" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    </div>
  );
}
