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
      .json({ message: `Welcome on Social Media App ` }),
  );

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


  app.use("/auth", authRouter);

  app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
    throw new AppError(
      `Url ${req.originalUrl} with method ${req.method} not found`,
      404,
    );
  });

  app.use(globalErrorHandler);

  app.listen(port, () => console.log(`Server is running on port ${port}`));
};
export default bootstrap;