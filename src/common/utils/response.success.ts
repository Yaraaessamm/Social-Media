import { Response } from "express";

export const successResponse = ({
  res,
  status = 200,
  message,
  data,
}: {
  res: Response;
  status?: number;
  message?: string;
  data?: unknown;
}) => {
  return res.status(status).json({ message, data });
};