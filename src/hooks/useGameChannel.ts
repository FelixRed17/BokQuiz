// src/hooks/useGameChannel.ts
import { useEffect, useRef } from "react";
import { getCable } from "../lib/cable";

type Payload = { type: string; payload?: any };

export function useGameChannel(
  gameCode: string | undefined,
  handlers: {
    onConnected?: () => void;
    onDisconnected?: () => void;
    onMessage?: (msg: Payload) => void;
  } = {}
) {
  const subRef = useRef<any>(null);

  useEffect(() => {
    if (!gameCode) return;

    const cable = getCable();
    subRef.current = cable.subscriptions.create(
      { channel: "GameChannel", code: gameCode },
      {
        connected() {
          handlers.onConnected?.();
        },
        disconnected() {
          handlers.onDisconnected?.();
        },
        received(data: any) {
          // data from server will be { type: "...", payload: {...} } per your broadcast
          handlers.onMessage?.(data as Payload);
        },
      }
    );

    return () => {
      try {
        if (subRef.current) {
          cable.subscriptions.remove(subRef.current);
          subRef.current = null;
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode]);
}
