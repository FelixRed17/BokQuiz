// src/types/actioncable.d.ts
declare module "@rails/actioncable" {
    export type Cable = {
      subscriptions: {
        create(
          channel: object,
          callbacks: {
            connected?: () => void;
            disconnected?: () => void;
            received?: (data: any) => void;
          }
        ): any;
        remove(subscription: any): void;
      };
    };
  
    export function createConsumer(url?: string): Cable;
  }
  