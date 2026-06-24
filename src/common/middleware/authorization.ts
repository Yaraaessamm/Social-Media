import { NextFunction, Request, Response } from "express";

export const authorization = (roles: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new Error("UnAuthorized", { cause: 403 });
    }
    next();
  };
};