import { useCallback, useEffect, useRef, useState } from "react";
import { useGameChannel } from "../../../hooks/useGameChannel";
import type { GameState } from "../types/games";

// Import the service - adjust path if needed
import * as gamesService from "../services/games.service";

type UseGameStateOptions = {
  /** Fallback polling interval when WebSocket is disconnected (ms) */
  pollIntervalMs?: number | null;
  /** Enable real-time updates via ActionCable */
  enableRealtime?: boolean;
  /** Manual mode: don't auto-fetch, only update via channel or manual reload */
  manualMode?: boolean;
};

export function useGameState(
  gameCode?: string,
  options: UseGameStateOptions = {}
) {
  const {
    pollIntervalMs = 3000,
    enableRealtime = true,
    manualMode = false,
  } = options;

  const [state, setState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch game state from API
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!gameCode) return;

      setIsLoading(true);
      setError(null);

      try {
        const newState = await gamesService.fetchGameState(gameCode);
        if (!mounted.current || signal?.aborted) return;
        setState(newState);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!mounted.current) return;
        setError(err?.message ?? "Failed to fetch game state");
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    },
    [gameCode]
  );

  // Start/stop polling based on connection state
  const startPolling = useCallback(() => {
    if (!pollIntervalMs) return; // disabled
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(() => {
      load();
    }, pollIntervalMs);
  }, [load, pollIntervalMs]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /**
   * Centralized real-time handling:
   * - On certain socket messages we either apply updates or refetch.
   * - In particular, when we receive a 'round_result' broadcast, we stop polling
   *   (so fallback doesn't race) and perform a single strong refresh via `load()`.
   */
  useGameChannel(
    enableRealtime ? gameCode : undefined,
    {
      onConnected: () => {
        setIsConnected(true);
        // Stop fallback polling when we have a live connection
        stopPolling();

        // Fetch latest state on connection
        load();
      },
      onDisconnected: () => {
        setIsConnected(false);

        // Start polling as fallback when WebSocket disconnects
        if (!manualMode) {
          startPolling();
        }
      },
      onMessage: (msg) => {
        // Handle different message types from the server
        switch (msg.type) {
          case "game_state_update":
            // Full state update from channel (server may send canonical state)
            if (msg.payload) {
              try {
                // If payload is already normalized, use directly;
                // otherwise attempt transform helper if available.
                setState(() => {
                  return msg.payload;
                });
              } catch (e) {
                console.debug("Received game_state_update but failed to set state:", e);
              }
            }
            break;

          case "game_state_changed":
            // Server signals state changed — fetch the latest canonical state
            load();
            break;

          case "player_joined":
          case "player_ready":
          case "player_eliminated":
          case "round_started":
          case "question_started":
          case "round_ended":
            // These events likely imply the state mutated; fetch latest state
            load();
            break;

          case "round_result":
            // Important: stop fallback polling (avoid race) and perform one strong refresh.
            // The server broadcast should be treated as the source of truth; fetch once
            // to ensure our local state and derived UI pieces are consistent.
            stopPolling();
            load();
            break;

          default:
            // Unknown message type, optionally log or ignore
            console.debug("Unknown message type in useGameState:", msg.type);
        }
      },
      onError: (err) => {
        console.error("GameChannel error:", err);
        setError(err.message);

        // Start polling on error
        if (!manualMode) {
          startPolling();
        }
      },
    }
  );

  // Initial load and fallback polling setup
  useEffect(() => {
    mounted.current = true;
    abortRef.current = new AbortController();

    // Initial load (unless in manual mode)
    if (!manualMode) {
      load(abortRef.current.signal);
    }

    // Start polling if real-time is disabled
    if (!enableRealtime && !manualMode) {
      startPolling();
    }

    return () => {
      mounted.current = false;
      stopPolling();
      abortRef.current?.abort();
    };
  }, [gameCode, load, enableRealtime, manualMode, startPolling, stopPolling]);

  return {
    state,
    isLoading,
    error,
    isConnected,
    reload: load,
  };
}
