import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGameState } from "../services/games.service";
import type { GameState } from "../types/games";

export function useGameState(gameCode?: string, { pollIntervalMs = 3000 } = {}) {
  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!gameCode) return;
      setIsLoading(true);
      setError(null);
      try {
        // fetchGameState uses the http wrapper which accepts signal through fetch
        const s = await fetchGameState(gameCode);
        if (!mounted.current) return;
        setState(s);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message ?? "Failed to fetch game state");
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [gameCode]
  );

  useEffect(() => {
    mounted.current = true;
    abortRef.current = new AbortController();
    load(abortRef.current.signal);

    const id = setInterval(() => {
      load();
    }, pollIntervalMs);

    return () => {
      mounted.current = false;
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [gameCode, load, pollIntervalMs]);

  return { state, isLoading, error, reload: load };
}
