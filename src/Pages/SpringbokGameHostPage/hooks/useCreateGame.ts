import { useCallback, useState } from "react";
import { createGame as createGameService } from "../services/games.service";
import type { Game } from "../types/games";

export function useCreateGame() {
  const [data, setData] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createGame = useCallback(async (hostName: string) => {
    if (!hostName.trim()) {
      setError("Please enter a host name");
      return undefined;
    }
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const game = await createGameService(hostName);
      setData(game);
      return game; // <— return for navigation
    } catch (e: any) {
      setError(e?.message ?? "Failed to create game.");
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, error, isLoading, createGame };
}
