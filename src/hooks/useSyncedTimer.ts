import { useState, useEffect, useRef } from 'react';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Parse the server timestamp if available
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

    // Update timer more frequently (every 100ms) for smooth countdown
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(remaining);
    };

    // Initial update
    updateTimer();

    // Set up interval
    intervalRef.current = setInterval(updateTimer, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [endsAt, fallbackSeconds]);

  return timeLeft;
}
