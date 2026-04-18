import type { Request, Response, NextFunction } from "express";
import { ACCESS_SECRET_KEY, PREFIX } from "../../config/config.service";
import { VerifyToken } from "../utils/token.service";
import { AppError } from "../utils/general-error-handler";
import UserRepository from "../../DB/repositories/user.repository";


export const authentication = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  const _userModel = new UserRepository();
  if (!authorization) {
    throw new AppError("Unauthorized: token missing.", 401);
  }
  const [prefix, token] = authorization.split(" ");
  if (prefix !== PREFIX) throw new AppError("Unauthorized: invalid token type", 401);
  if (!token) throw new AppError("Unauthorized: token missing", 401);


  const decoded = VerifyToken({ token, secret_key: ACCESS_SECRET_KEY });
  if (!decoded || !decoded?.id) throw new AppError("Unauthorized: Invalid token", 401);


  const user = await _userModel.findById(decoded.id);
  if (!user) throw new AppError("User not found", 401);

  
  req.user = user;
  req.decoded = decoded;
  next();
};