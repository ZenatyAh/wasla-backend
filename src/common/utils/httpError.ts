import type { Response } from "express";

export const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  return fallback;
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
) => {
  return res.status(statusCode).json({
    status: "fail",
    message,
  });
};
