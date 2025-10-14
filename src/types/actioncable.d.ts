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
      channelName: string | { channel: string; [key: string]: any },
      callbacks?: SubscriptionCallbacks
    ): Subscription;
    remove(subscription: Subscription): void;
  }

  export interface Subscription {
    unsubscribe(): void;
    perform(action: string, data?: any): void;
    send(data: any): void;
    identifier: string;
  }

  export interface SubscriptionCallbacks {
    connected?(): void;
    disconnected?(): void;
    received?(data: any): void;
    rejected?(): void;
  }

  export type Consumer = Cable;

  export function createConsumer(url?: string): Consumer;
  export function createWebSocketURL(url: string): string;
  export function getConfig(name: string): any;
}