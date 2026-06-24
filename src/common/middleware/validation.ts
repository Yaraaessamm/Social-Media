import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/general-error-handler";

type reqType = keyof Request; // "body" | "query" | "params" | ...
type schemaType = Partial<Record<reqType, ZodType>>; // {body?:zodtype, query?:zodtype, ...}

export const validation = (schema: schemaType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const validationError: any[] = [];
    for (const key of Object.keys(schema) as reqType[]) {
      if (!schema[key]) continue;
      if (req.file) req.body.attachment = req.file;
      if (req.files) req.body.attachments = req.files;
      const result = await schema[key].safeParseAsync(req[key]);
      if (!result.success) {
        result.error.issues.forEach((e) => {
          validationError.push({
            key,
            path: e.path[0],
            message: e.message,
          });
        });
      }
    }
    if (validationError.length > 0) {
      throw new AppError(validationError, 400);
    }
    next();
  };
};