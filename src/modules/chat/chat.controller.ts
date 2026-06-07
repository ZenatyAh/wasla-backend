import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import {
  conversationIdParamSchema,
  createConversationSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
} from "./chat.schema.js";
import {
  createOrGetConversation,
  getConversationById,
  listConversations,
} from "./chat.service.js";
import { getUserId, handleChatControllerError } from "./chat.utils.js";
import { listMessages, sendMessage } from "./message.service.js";

export const createConversationController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const data = createConversationSchema.parse(req.body);
    const result = await createOrGetConversation(userId, data);

    return res.status(result.isNew ? 201 : 200).json({
      conversation: result.conversation,
    });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Create conversation failed");
  }
};

export const listConversationsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const query = listConversationsQuerySchema.parse(req.query);
    const result = await listConversations(userId, query);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "List conversations failed");
  }
};

export const getConversationController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { conversationId } = conversationIdParamSchema.parse(req.params);
    const conversation = await getConversationById(userId, conversationId);

    return res.json({ conversation });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Get conversation failed");
  }
};

export const listMessagesController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { conversationId } = conversationIdParamSchema.parse(req.params);
    const query = listMessagesQuerySchema.parse(req.query);
    const result = await listMessages(userId, conversationId, query);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "List messages failed");
  }
};

export const sendMessageController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { conversationId } = conversationIdParamSchema.parse(req.params);
    const data = sendMessageSchema.parse(req.body);
    const message = await sendMessage(userId, conversationId, data);

    return res.status(201).json({ message });
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Send message failed");
  }
};
