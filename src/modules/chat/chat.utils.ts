import type { Request, Response } from "express";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { ChatError } from "./chat.errors.js";

export const getUserId = (req: Request) => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId)) {
    return null;
  }
  return userId;
};

export const getChatErrorStatus = (message: string) => {
  if (message === "Post not found" || message === "Recipient not found") {
    return 404;
  }
  if (
    message === "Conversation not found" ||
    message === "Message not found" ||
    message === "Notification not found"
  ) {
    return 404;
  }
  if (
    message === "You do not have access to this resource" ||
    message === "You can only edit your own messages" ||
    message === "You can only delete your own messages" ||
    message === "You cannot mark your own message as read"
  ) {
    return 403;
  }
  return 400;
};

export const handleChatControllerError = (
  res: Response,
  err: unknown,
  fallback: string,
) => {
  if (err instanceof ChatError) {
    return sendError(res, err.statusCode, err.message);
  }

  const message = getErrorMessage(err, fallback);
  return sendError(res, getChatErrorStatus(message), message);
};
