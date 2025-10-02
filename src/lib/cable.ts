// tiny ActionCable consumer singleton
import * as ActionCable from "@rails/actioncable";

let consumer: ActionCable.Cable | null = null;

export function getCable() {
  if (!consumer) {
    // default to same origin — adjust if your backend URL differs
    consumer = ActionCable.createConsumer();
  }
  return consumer;
}


