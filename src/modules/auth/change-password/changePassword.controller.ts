import type { Request, Response } from "express";
import { clearRefreshTokenCookie } from "../../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";
import { getUserId } from "../../chat/chat.utils.js";
import type { ChangePasswordInput } from "../auth.schema.js";
import { changePasswordService } from "./changePassword.service.js";

const getChangePasswordErrorStatus = (message: string) => {
  if (message === "Invalid password") {
    return 401;
  }
  if (message === "User not found") {
    return 404;
  }
  return 400;
};

export const changePasswordController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    await changePasswordService(userId, currentPassword, newPassword);

    clearRefreshTokenCookie(res);
    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Change password failed");
    return sendError(res, getChangePasswordErrorStatus(message), message);
  }
};
