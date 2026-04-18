import { EventEmitter } from "node:events";
import { emailEnum } from "../../enum/email.enum.js";

export const eventEmitter = new EventEmitter();
Object.values(emailEnum).forEach((event) => {
  eventEmitter.on(event, async (fn) => await fn());
});