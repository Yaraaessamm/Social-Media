import { EventEmitter } from "node:events";
import { EmailEnum } from "../../enum/email.enum.js";

export const eventEmitter = new EventEmitter();
eventEmitter.on(EmailEnum.confirmEmail, async (fn) => {
  await fn();
});