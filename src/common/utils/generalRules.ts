import * as z from "zod";
import { Types } from "mongoose";

export const generalRules = {
  id: z.string().refine(
    (value) => {
      return Types.ObjectId.isValid(value);
    },
    { message: "Invalid id" },
  ),

  file: z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    buffer: z.any().optional(),
    path: z.string().optional(),
    size: z.number(),
  }),
};