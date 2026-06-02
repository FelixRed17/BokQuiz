// src/lib/cable.ts
import { createConsumer } from "@rails/actioncable";
import { ACTION_CABLE_URL } from "./env";

let consumer: ReturnType<typeof createConsumer> | null = null;

export function getCable() {
  if (!consumer) {
    consumer = createConsumer(ACTION_CABLE_URL);
  }
  return consumer;
}


