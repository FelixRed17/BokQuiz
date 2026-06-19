// src/types/actioncable.d.ts
// Type definitions for @rails/actioncable

declare module "@rails/actioncable" {
  export interface Cable {
    subscriptions: Subscriptions;
    disconnect(): void;
    connect(): void;
  }

  export interface Subscriptions {
    create(
      channelName: string | { channel: string; [key: string]: unknown },
      callbacks?: SubscriptionCallbacks
    ): Subscription;
    remove(subscription: Subscription): void;
  }

  export interface Subscription {
    unsubscribe(): void;
    perform(action: string, data?: unknown): void;
    send(data: unknown): void;
    identifier: string;
  }

  export interface SubscriptionCallbacks {
    connected?(): void;
    disconnected?(): void;
    received?(data: unknown): void;
    rejected?(): void;
  }

  export type Consumer = Cable;

  export function createConsumer(url?: string): Consumer;
  export function createWebSocketURL(url: string): string;
  export function getConfig(name: string): unknown;
}
