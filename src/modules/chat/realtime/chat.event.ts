import { Socket } from "socket.io";
import chatService from "../chat.service";

class ChatEvent {
  constructor() {}

  sayHi = async (socket: Socket) => {
    socket.on("sayHi", (data) => {
      chatService.sayHi(data);
    });
  };
  
  sendMessage = async (socket: Socket) => {
    socket.on("sendMessage", (data) => {
      chatService.sendMessage(data);
    });
  };
}

export default new ChatEvent();