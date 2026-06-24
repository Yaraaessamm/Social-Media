import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { PORT } from "./config/config.service";
import {
  AppError,
  globalErrorHandler,
} from "./common/utils/general-error-handler";
import authRouter from "./modules/auth/auth.controller";
import { checkConnectionDB } from "./DB/connectionDB";
import redisService from "./common/service/redis.service";
import userModel from "./DB/models/user.model";
import { S3Service } from "./common/service/s3.service";
import { successResponse } from "./common/utils/response.success";
import { pipeline } from "node:stream/promises";
import notificationService from "./common/service/notification.service";
import postRouter from "./modules/posts/post.controller";
import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import { createHandler } from "graphql-http/lib/use/express";
import { GenderEnum } from "./common/enum/user.enum";
import { Server } from "socket.io";
import { decodedToken_and_fetchUser } from "./common/middleware/authentication";
import socketGateway from "./modules/realtime/socket.gateway";

const app: express.Application = express();
const port: number = Number(PORT);

const bootstrap = async () => {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (req: Request, res: Response, next: NextFunction) => {
      throw new AppError("Too many requests from this IP", 429);
    },
  });
  app.use(cors(), helmet(), limiter, express.json());

  checkConnectionDB();
  await redisService.connect();

  app.get("/", (req: Request, res: Response, next: NextFunction) =>
    res
      .status(200)
      .json({ message: `Welcome on Social Media App ...........` }),
  );
  const users = [];

  const GenderType = new GraphQLEnumType({
    name: "GenderType",
    values: {
      male: { value: "male" },
      female: { value: "female" },
    },
  });
  const userType = new GraphQLObjectType({
    name: "getUser",
    fields: {
      id: { type: GraphQLInt },
      age: { type: GraphQLInt },
      name: { type: GraphQLString },
      gender: { type: GenderType },
    },
  });

  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: "query",
      // description: "",
      fields: {
        createUser: {
          type: GraphQLString,
          resolve: () => {
            return "hello";
          },
        },
      },
    }),
    mutation: new GraphQLObjectType({
      name: "mutation",
      fields: {
        createUser: {
          type: userType,
          args: {
            id: { type: new GraphQLNonNull(GraphQLInt) },
            age: { type: new GraphQLNonNull(GraphQLInt) },
            gender: { type: new GraphQLNonNull(GenderType) },
            name: { type: new GraphQLNonNull(GraphQLString) },
          },
          resolve: (parent, args) => {
            const userExist = users.find((user) => user.id == args.id);
          },
        },
      },
    }),
  });

  app.use("/graphql", createHandler({ schema }));

  app.post(
    "/send-notification",
    async (req: Request, res: Response, next: NextFunction) => {
      await notificationService.sendNotification({
        token: req.body.token,
        data: { title: "Hi", body: "hiii tany" },
      });
      console.log({ token: req.body.token });
    },
  );

  // async function test() {
  //   const user = await userModel.findOne({
  //     firstName: "Abrar",
  //     paranoid: true,
  //   });
  //   console.log({ user });
  // }
  // test();

  app.get(
    "/upload",
    async (req: Request, res: Response, next: NextFunction) => {
      const { folderName } = req.query as { folderName: string };
      const result = await new S3Service().getFiles(folderName);
      const resultMapped = result.Contents?.map((file) => {
        return { Key: file.Key };
      });
      successResponse({ res, data: resultMapped });
    },
  );
  // app.get(
  //   "/upload/*path",
  //   async (req: Request, res: Response, next: NextFunction) => {
  //     const { path } = req.params as { path: string[] };
  //     const { download } = req.query;
  //     const Key = path.join("/");
  //     const result = await new S3Service().getFile(Key);
  //     const stream = result.Body as NodeJS.ReadableStream;

  //     res.setHeader("Content-Type", result.ContentType!);
  //     res.setHeader("Cross-Origin_Resource-Policy", "cross-origin");

  //     if (download && download === "true") {
  //       res.setHeader(
  //         "Content-Disposition",
  //         `attachment; filename="${path.pop()}"`,
  //       );
  //     }
  //     await pipeline(stream, res);
  //     successResponse({ res, data: result });
  //   },
  // );

  app.use("/auth", authRouter);
  app.use("/posts", postRouter);

  app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
    throw new AppError(
      `Url ${req.originalUrl} with method ${req.method} not found`,
      404,
    );
  });

  app.use(globalErrorHandler);
  const httpServer = app.listen(port, () =>
    console.log(`Server is running on port ${port}`),
  );
  await socketGateway.initIo(httpServer);
};
export default bootstrap;