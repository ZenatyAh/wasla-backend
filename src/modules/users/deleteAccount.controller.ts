import type { Request, Response } from "express";
import { clearRefreshTokenCookie } from "../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { getUserId } from "../chat/chat.utils.js";
import { deleteAccountSchema } from "./deleteAccount.schema.js";
import { deleteAccountService } from "./deleteAccount.service.js";

const getDeleteAccountErrorStatus = (message: string) => {
  if (message === "Invalid password") {
    return 401;
  }
  if (message === "User not found") {
    return 404;
  }
  if (message === "Account already deleted") {
    return 400;
  }
  if (message.startsWith("Cannot delete account")) {
    return 409;
  }
  return 400;
};

export const deleteAccountController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { password } = deleteAccountSchema.parse(req.body);
    await deleteAccountService(userId, password);

    clearRefreshTokenCookie(res);
    return res.status(204).end();
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Delete account failed");
    return sendError(res, getDeleteAccountErrorStatus(message), message);
  }
};
