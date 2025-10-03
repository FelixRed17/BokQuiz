declare module "@rails/actioncable" {
  export type SubscriptionCallbacks = {
    connected?: () => void;
    disconnected?: () => void;
    received?: (data: any) => void;
  };

  export type Subscription = {
    unsubscribe(): void;
  };

  export type Subscriptions = {
    create(identifier: any, callbacks: SubscriptionCallbacks): Subscription;
    remove(subscription: Subscription): void;
  };

  export type Cable = {
    subscriptions: Subscriptions;
  };

  export function createConsumer(url?: string): Cable;
}
