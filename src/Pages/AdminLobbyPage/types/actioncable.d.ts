import "@rails/actioncable";

declare module "@rails/actioncable" {
  interface Subscription {
    perform(action: string, data?: unknown): void;
  }
  
  interface SubscriptionCallbacks {
    rejected?(): void;
  }
}
