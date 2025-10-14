import { useEffect, useRef, useCallback } from "react";
import { getCable } from "../lib/cable";
import type { Subscription } from "@rails/actioncable";

type Payload = { type: string; payload?: any };

type GameChannelHandlers = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onMessage?: (msg: Payload) => void;
  onError?: (error: Error) => void;
};

export function useGameChannel(
  gameCode: string | undefined,
  handlers: GameChannelHandlers = {}
) {
  const subRef = useRef<Subscription | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers ref up to date without triggering reconnections
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!gameCode) return;

    let isSubscribed = true;

    try {
      const cable = getCable();
      
      subRef.current = cable.subscriptions.create(
        { channel: "GameChannel", code: gameCode },
        {
          connected() {
            if (isSubscribed) {
              handlersRef.current.onConnected?.();
            }
          },
          disconnected() {
            if (isSubscribed) {
              handlersRef.current.onDisconnected?.();
            }
          },
          received(data: any) {
            if (isSubscribed) {
              handlersRef.current.onMessage?.(data as Payload);
            }
          },
          rejected() {
            if (isSubscribed) {
              handlersRef.current.onError?.(
                new Error(`Subscription rejected for game: ${gameCode}`)
              );
            }
          },
        }
      );
    } catch (error) {
      handlersRef.current.onError?.(
        error instanceof Error ? error : new Error("Failed to create subscription")
      );
    }

    return () => {
      isSubscribed = false;
      try {
        if (subRef.current) {
          const cable = getCable();
          cable.subscriptions.remove(subRef.current);
          subRef.current = null;
        }
      } catch (e) {
        // Silently handle cleanup errors
        console.warn("Error during channel cleanup:", e);
      }
    };
  }, [gameCode]);

  // Return method to send messages through the channel
  const send = useCallback((action: string, data?: any) => {
    if (!subRef.current) {
      console.warn("Cannot send message: Channel not connected");
      return false;
    }
    
    try {
      subRef.current.perform(action, data);
      return true;
    } catch (error) {
      handlersRef.current.onError?.(
        error instanceof Error ? error : new Error("Failed to send message")
      );
      return false;
    }
  }, []);

  return { send };
}
