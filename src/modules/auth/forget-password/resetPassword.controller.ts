import type { Request, Response } from "express";
import type { ResetPasswordInput } from "../auth.schema.js";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";
import { resetPasswordService } from "./resetPasswordService.js";

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as ResetPasswordInput;

    await resetPasswordService(token, newPassword);

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (err: unknown) {
    return sendError(
      res,
      400,
      getErrorMessage(err, "Invalid or expired token"),
    );
  }
};
