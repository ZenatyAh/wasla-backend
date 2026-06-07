import { prisma } from "../../lib/prisma.js";
import { createMessageNotification } from "../notifications/notification.service.js";
import { emitToConversation } from "../../realtime/socket.js";
import { ChatError } from "./chat.errors.js";
import { assertConversationParticipant } from "./chat.guard.js";
import {
  messageInclude,
  toMessageResponse,
} from "./chat.mapper.js";
import type { EditMessageInput, ListMessagesQuery, SendMessageInput } from "./chat.schema.js";

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

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.message.create({
      data: {
        conversationId,
        senderId: callerId,
        body: input.body,
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

  const recipient = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId: { not: callerId },
    },
    include: {
      user: { select: { id: true, email: true, full_name: true } },
    },
  });

  if (recipient) {
    try {
      const notification = await createMessageNotification({
        recipientId: recipient.userId,
        recipientEmail: recipient.user.email,
        recipientName: recipient.user.full_name,
        senderName: message.sender.username,
        conversationId,
        messageId: message.id,
        postId: (
          await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { postId: true },
          })
        )?.postId,
        preview: input.body,
      });

      emitToConversation(conversationId, "chat:notification:new", notification);
    } catch {
      // Notification/email failures must not block message delivery.
    }
  }

  emitToConversation(conversationId, "chat:message:new", response);

  return response;
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

  const readReceipt = await prisma.messageReadReceipt.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: callerId,
      },
    },
    update: {},
    create: {
      messageId,
      userId: callerId,
    },
  });

  emitToConversation(message.conversationId, "chat:message:read", readReceipt);

  return readReceipt;
};
