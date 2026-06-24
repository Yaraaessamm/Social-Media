import { Socket } from "socket.io";
import chatEvent from "./chat.event";

class ChatGateway {
  constructor() {}

  registerEvent = async (socket: Socket) => {
    chatEvent.sayHi(socket)
    chatEvent.sendMessage(socket)
  };
}

export default new ChatGateway();