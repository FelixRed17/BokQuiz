// src/lib/cable.ts
import { createConsumer } from "@rails/actioncable";

let consumer: ReturnType<typeof createConsumer> | null = null;

export function getCable() {
  if (!consumer) {
    const url = import.meta.env.VITE_ACTION_CABLE_URL; // now properly typed
    consumer = createConsumer(url);
  }
  return consumer;
}



