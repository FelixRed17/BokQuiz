import "@rails/actioncable";

declare module "@rails/actioncable" {
  interface Subscription {
    perform(action: string, data?: any): void;
  }
  
  interface SubscriptionCallbacks {
    rejected?(): void;
  }
}