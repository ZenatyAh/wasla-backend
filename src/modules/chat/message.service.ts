import { fireAndForget } from "../../common/utils/fireAndForget.js";
import { prisma } from "../../lib/prisma.js";
import { processReadMessagesSync } from "../../realtime/message-status.batch.js";
import { emitToConversation, emitToUser } from "../../realtime/socket.js";
import { createMessageNotification } from "../notifications/notification.service.js";
import { ChatError } from "./chat.errors.js";
import { assertConversationParticipant } from "./chat.guard.js";
import {
  messageInclude,
  toMessageResponse,
} from "./chat.mapper.js";
import type { EditMessageInput, ListMessagesQuery, SendMessageInput } from "./chat.schema.js";

const isUniqueConstraintError = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code: string }).code === "P2002";

const processMessageSideEffects = (params: {
  callerId: number;
  conversationId: string;
  messageId: string;
  senderName: string;
  preview: string;
  response: ReturnType<typeof toMessageResponse>;
}) => {
  const {
    callerId,
    conversationId,
    messageId,
    senderName,
    preview,
    response,
  } = params;

  fireAndForget("chat:message-side-effects", async () => {
    emitToUser(callerId, "chat:message:sent", response);
    emitToConversation(conversationId, "chat:message:new", response);

    const recipient = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: { not: callerId },
      },
      include: {
        user: { select: { id: true, email: true, full_name: true } },
      },
    });

    if (!recipient) {
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { postId: true },
    });

    const notification = await createMessageNotification({
      recipientId: recipient.userId,
      recipientEmail: recipient.user.email,
      recipientName: recipient.user.full_name,
      senderName,
      conversationId,
      messageId,
      postId: conversation?.postId ?? undefined,
      preview,
    });

    emitToConversation(conversationId, "chat:notification:new", notification);
  });
};

const buildMessageCursorFilter = async (cursor?: string) => {
  if (!cursor) {
    return {};
  }

  const cursorMessage = await prisma.message.findUnique({
    where: { id: cursor },
    select: { id: true, createdAt: true },
  });

  if (!cursorMessage) {
    return {};
  }

  return {
    OR: [
      { createdAt: { lt: cursorMessage.createdAt } },
      {
        AND: [
          { createdAt: cursorMessage.createdAt },
          { id: { lt: cursorMessage.id } },
        ],
      },
    ],
  };
};

export const listMessages = async (
  callerId: number,
  conversationId: string,
  query: ListMessagesQuery,
) => {
  await assertConversationParticipant(conversationId, callerId);

  const limit = query.limit ?? 30;
  const cursorFilter = await buildMessageCursorFilter(query.cursor);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      ...cursorFilter,
    },
    include: messageInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;

  return {
    messages: page.reverse().map(toMessageResponse),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
};

export const sendMessage = async (
  callerId: number,
  conversationId: string,
  input: SendMessageInput,
) => {
  await assertConversationParticipant(conversationId, callerId);

  const existing = await prisma.message.findUnique({
    where: { clientMessageId: input.clientMessageId },
    include: messageInclude,
  });

  if (existing) {
    if (
      existing.conversationId !== conversationId ||
      existing.senderId !== callerId
    ) {
      throw new ChatError("clientMessageId already used for another message", 409);
    }

    return {
      message: toMessageResponse(existing),
      isDuplicate: true,
    };
  }

  try {
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: callerId,
          body: input.body,
          clientMessageId: input.clientMessageId,
          status: "SENT",
        },
        include: messageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    const response = toMessageResponse(message);

    processMessageSideEffects({
      callerId,
      conversationId,
      messageId: message.id,
      senderName: message.sender.username,
      preview: input.body,
      response,
    });

    return {
      message: response,
      isDuplicate: false,
    };
  } catch (err: unknown) {
    if (!isUniqueConstraintError(err)) {
      throw err;
    }

    const raced = await prisma.message.findUnique({
      where: { clientMessageId: input.clientMessageId },
      include: messageInclude,
    });

    if (!raced) {
      throw err;
    }

    if (
      raced.conversationId !== conversationId ||
      raced.senderId !== callerId
    ) {
      throw new ChatError("clientMessageId already used for another message", 409);
    }

    return {
      message: toMessageResponse(raced),
      isDuplicate: true,
    };
  }
};

export const editMessage = async (
  callerId: number,
  messageId: string,
  input: EditMessageInput,
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });

  if (!message) {
    throw new ChatError("Message not found", 404);
  }

  await assertConversationParticipant(message.conversationId, callerId);

  if (message.senderId !== callerId) {
    throw new ChatError("You can only edit your own messages", 403);
  }

  if (message.deletedAt) {
    throw new ChatError("Deleted messages cannot be edited", 400);
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      body: input.body,
      editedAt: new Date(),
    },
    include: messageInclude,
  });

  const response = toMessageResponse(updated);
  emitToConversation(message.conversationId, "chat:message:edited", response);

  return response;
};

export const deleteMessage = async (callerId: number, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });

  if (!message) {
    throw new ChatError("Message not found", 404);
  }

  await assertConversationParticipant(message.conversationId, callerId);

  if (message.senderId !== callerId) {
    throw new ChatError("You can only delete your own messages", 403);
  }

  if (message.deletedAt) {
    return toMessageResponse(message);
  }

  const deleted = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    include: messageInclude,
  });

  const response = toMessageResponse(deleted);
  emitToConversation(message.conversationId, "chat:message:deleted", {
    id: response.id,
    conversationId: response.conversationId,
    deletedAt: response.deletedAt,
  });

  return response;
};

export const markMessageAsRead = async (callerId: number, messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      conversationId: true,
      senderId: true,
    },
  });

  if (!message) {
    throw new ChatError("Message not found", 404);
  }

  await assertConversationParticipant(message.conversationId, callerId);

  if (message.senderId === callerId) {
    throw new ChatError("You cannot mark your own message as read", 403);
  }

  await processReadMessagesSync(callerId, message.conversationId, [messageId]);

  const readReceipt = await prisma.messageReadReceipt.findUnique({
    where: {
      messageId_userId: {
        messageId,
        userId: callerId,
      },
    },
  });

  if (!readReceipt) {
    throw new ChatError("Failed to mark message as read", 500);
  }

  emitToConversation(message.conversationId, "chat:message:read", readReceipt);

  return readReceipt;
};
