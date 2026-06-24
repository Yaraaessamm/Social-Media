import { Server } from "socket.io";
import { Server as HttpServer } from "node:http";
import { decodedToken_and_fetchUser } from "../../common/middleware/authentication";
import redisService from "../../common/service/redis.service";
import chatGateway from "../chat/realtime/chat.geteway";

class SocketGateway {
  constructor() {}
  initIo = async (httpServer: HttpServer) => {
    const io = new Server(httpServer, { cors: { origin: "*" } });
    io.use(async (socket, next) => {
      try {
        const user = await decodedToken_and_fetchUser(
          socket.handshake.auth.authorization,
        );
        socket.data.user = user;
        next();
      } catch (error: any) {
        next(error);
      }
    });
    // Connection =============================>
    io.on("connection", async (socket) => {
      redisService.addSocket({
        userId: socket.data.user._id,
        socketId: socket.id,
      });
      await chatGateway.registerEvent(socket)
      console.log({
        userSocketIds: await redisService.getSockets(socket.data.user._id),
      });
      // disconnection =============================>
      socket.on("disconnect", async () => {
        await redisService.removeSocket({
          userId: socket.data.user._id,
          socketId: socket.id,
        });
        console.log({
          userSocketIdsAfterDisconnect: await redisService.getSockets(
            socket.data.user._id,
          ),
        });
      });
    });
    // io.on("connection", (socket) => {
    //   console.log(socket.id, "-----------");
    //   console.log(socket.data.user);
    //   socket.on("hi", (data, cb) => {
    //     console.log(data);
    //     // socket.emit("sayHiBack", {message: "hi from backend"})
    //     // cb("hi from backend");
    //     // io.emit("sayHiBack", {message: "hi from backend"})
    //     // socket.broadcast.emit("sayHiBack", {message: "hi from backend"})
    //     // socket.to(data.id).emit("sayHiBack", {message: "hi from backend"})
    //     // socket.except(data.id).emit("sayHiBack", {message: "hi from backend"})
    //     io.except(data.id).emit("sayHiBack", { message: "hi from backend" });
    //   });
    // });
    // io.of("/admin").on("connection", (socket) => {
    //   console.log(socket.id, "===========");
    //   socket.on("hi", (data, cb) => {
    //     console.log(data);
    //     // socket.emit("sayHiBack", {message: "hi from backend"})
    //     cb("hi from backend");
    //   });
    // });
  };
}

export default new SocketGateway();