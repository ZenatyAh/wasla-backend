import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import { editMessageSchema, messageIdParamSchema } from "./chat.schema.js";
import { getUserId, handleChatControllerError } from "./chat.utils.js";
import {
  deleteMessage,
  editMessage,
  markMessageAsRead,
} from "./message.service.js";

export const editMessageController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { messageId } = messageIdParamSchema.parse(req.params);
    const data = editMessageSchema.parse(req.body);
    const message = await editMessage(userId, messageId, data);

    return res.json({ message });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Edit message failed");
  }
};

export const deleteMessageController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { messageId } = messageIdParamSchema.parse(req.params);
    const message = await deleteMessage(userId, messageId);

    return res.json({ message });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Delete message failed");
  }
};

export const markMessageReadController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { messageId } = messageIdParamSchema.parse(req.params);
    const readReceipt = await markMessageAsRead(userId, messageId);

    return res.json({ readReceipt });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Mark message read failed");
  }
};
