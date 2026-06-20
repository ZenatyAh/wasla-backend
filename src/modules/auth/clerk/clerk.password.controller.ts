import type { Request, Response } from "express";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";
import { clerkForgotPasswordService } from "./clerk.password.service.js";

export const clerkForgotPasswordController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body as { email: string };
    const result = await clerkForgotPasswordService(email);

    return res.status(200).json({
      message: "If the email exists, we sent a reset link",
      ...(result.resetUrl ? { resetUrl: result.resetUrl } : {}),
    });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Invalid request data"));
  }
};
