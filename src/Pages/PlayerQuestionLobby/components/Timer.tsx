import React from 'react';
import './Timer.css';

interface TimerProps {
  timeLeft: number;
  className?: string;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, className = '' }) => {
  return <div className={`timer ${className}`}>{timeLeft}</div>;
};

export default Timer;

