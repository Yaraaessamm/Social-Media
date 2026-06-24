import type { Request, Response, NextFunction } from "express";
import {
  ACCESS_SECRET_KEY_ADMIN,
  ACCESS_SECRET_KEY_USER,
  PREFIX_ADMIN,
  PREFIX_USER,
} from "../../config/config.service";
import { VerifyToken } from "../service/token.service";
import { AppError } from "../utils/general-error-handler";
import UserRepository from "../../DB/repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: any;
      decoded?: any;
    }
  }
}

const _userModel = new UserRepository();

export const decodedToken_and_fetchUser = async (authorization: string) => {
  if (!authorization) {
    throw new AppError("Unauthorized: token missing.", 401);
  }
  const [prefix, token] = authorization.split(" ");
  let ACCESS_SECRET_KEY = "";
  if (prefix == PREFIX_USER) ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_USER!;
  else if (prefix == PREFIX_ADMIN) ACCESS_SECRET_KEY = ACCESS_SECRET_KEY_ADMIN!;
  else throw new AppError("Unauthorized: invalid token type", 401);

  if (!token) throw new AppError("Unauthorized: token missing", 401);

  // Verify Token and get decoded data ------->
  const decoded = VerifyToken({ token, secret_key: ACCESS_SECRET_KEY });
  if (!decoded || !decoded?.id)
    throw new AppError("Unauthorized: Invalid token", 401);

  // Check user exist in DB ------------------>
  const user = await _userModel.findById(decoded.id);
  if (!user) throw new AppError("User not found", 401);

  return { user, decoded };
};

export const authentication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { authorization } = req.headers;
  const { user, decoded } = await decodedToken_and_fetchUser(authorization!);
  // ------------------------------>
  req.user = user;
  req.decoded = decoded;
  next();
};