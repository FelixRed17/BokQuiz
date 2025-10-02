import { useEffect, useRef } from "react";
import { getCable } from "../lib/cable";

type GameChannelPayload = {
  type: string;
  payload?: any;
};

type Handlers = {
  onMessage?: (msg: GameChannelPayload) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
};

export function useGameChannel(gameCode: string | undefined, handlers: Handlers = {}) {
  const subRef = useRef<any>(null);

  useEffect(() => {
    if (!gameCode) return;
    const cable = getCable();
    // subscribe to GameChannel with stream identifier (the server likely uses broadcast_to @game)
    // We pass { game_code: gameCode } if your channel supports params; if not, server will still broadcast_to
    subRef.current = cable.subscriptions.create(
      { channel: "GameChannel", code: gameCode },
      {
        connected() {
          handlers.onConnected?.();
        },
        disconnected() {
          handlers.onDisconnected?.();
        },
        received(data: GameChannelPayload) {
          handlers.onMessage?.(data);
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
