import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import { getUserId, handleChatControllerError } from "../chat/chat.utils.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "./notification.schema.js";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.service.js";

export const listNotificationsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await listNotifications(userId, query);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "List notifications failed");
  }
};

export const markNotificationReadController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { id } = notificationIdParamSchema.parse(req.params);
    const notification = await markNotificationAsRead(userId, id);

    return res.json({ notification });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Mark notification read failed");
  }
};

export const markAllNotificationsReadController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const result = await markAllNotificationsAsRead(userId);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Mark all notifications read failed");
  }
};
