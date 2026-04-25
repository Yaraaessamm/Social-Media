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