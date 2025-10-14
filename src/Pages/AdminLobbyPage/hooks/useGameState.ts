import { useCallback, useEffect, useRef, useState } from "react";
import { useGameChannel } from "../../../hooks/useGameChannel";
import type { GameState } from "../types/games";

// Import the service - adjust path if needed
import * as gamesService from "../services/games.service";

type UseGameStateOptions = {
  /** Fallback polling interval when WebSocket is disconnected (ms) */
  pollIntervalMs?: number;
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Setup ActionCable subscription for real-time updates
  useGameChannel(
    enableRealtime ? gameCode : undefined,
    {
      onConnected: () => {
        setIsConnected(true);
        stopPolling(); // Stop polling when connected to WebSocket
        
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
            // Full state update
            if (msg.payload) {
              setState(msg.payload);
            }
            break;
          
          case "game_state_changed":
            // Server signals state changed, fetch the latest
            load();
            break;
          
          case "player_joined":
          case "player_ready":
          case "player_eliminated":
          case "round_started":
          case "question_started":
          case "round_ended":
            // Any event that affects game state - refetch
            load();
            break;
          
          default:
            // Unknown message type, optionally log or ignore
            console.debug("Unknown message type:", msg.type);
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