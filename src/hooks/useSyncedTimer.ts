import { useEffect, useState } from 'react';

/**
 * A timer hook that stays synchronized with a server-provided end timestamp.
 * Updates every 100ms for smooth countdown without drift.
 * 
 * @param endsAt - ISO timestamp string from server indicating when the timer ends
 * @param fallbackSeconds - Fallback duration if endsAt is not provided
 * @returns Current seconds remaining (rounded)
 */
export function useSyncedTimer(endsAt: string | null | undefined, fallbackSeconds: number = 20): number {
  const [timeLeft, setTimeLeft] = useState<number>(fallbackSeconds);

  useEffect(() => {
    let endTime: number;
    
    if (endsAt) {
      try {
        endTime = new Date(endsAt).getTime();
      } catch {
        // If parsing fails, fall back to local countdown
        endTime = Date.now() + (fallbackSeconds * 1000);
      }
    } else {
      // No server timestamp - use fallback
      endTime = Date.now() + (fallbackSeconds * 1000);
    }

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft((current) => (current === remaining ? current : remaining));

      if (remaining === 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 250);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [endsAt, fallbackSeconds]);

  return timeLeft;
}
