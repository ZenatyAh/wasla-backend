import { prisma } from "../../lib/prisma.js";
import { type NotificationType } from "../../generated/prisma/client.js";
import { sendMessageEmail } from "../../common/utils/sendMessageEmail.js";
import { emitToUser } from "../../realtime/emit.js";
import { ChatError } from "../chat/chat.errors.js";
import type { ListNotificationsQuery } from "./notification.schema.js";

const toNotificationResponse = (notification: {
  id: string;
  userId: number;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: Date;
}) => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

type NotificationResponse = ReturnType<typeof toNotificationResponse>;

const publishNotificationToUser = (
  userId: number,
  notification: NotificationResponse,
) => {
  emitToUser(userId, "notification:new", notification);

  if (notification.type === "NEW_MESSAGE") {
    emitToUser(userId, "chat:notification:new", notification);
  }
};

export const createMessageNotification = async (input: {
  recipientId: number;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  conversationId: string;
  messageId: string;
  postId?: number;
  preview: string;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.recipientId,
      type: "NEW_MESSAGE",
      title: `رسالة جديدة من ${input.senderName}`,
      body: input.preview,
      data: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        postId: input.postId ?? null,
      },
    },
  });

  try {
    await sendMessageEmail(
      input.recipientEmail,
      input.senderName,
      input.preview,
    );
  } catch {
    // Email failures must not block in-app notifications.
  }

  const response = toNotificationResponse(notification);
  publishNotificationToUser(input.recipientId, response);
  return response;
};

export const createContractNotification = async (input: {
  recipientId: number;
  type: NotificationType;
  title: string;
  body: string;
  contractId: number;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: { contractId: input.contractId },
    },
  });

  const response = toNotificationResponse(notification);
  publishNotificationToUser(input.recipientId, response);
  return response;
};

export const listNotifications = async (
  userId: number,
  query: ListNotificationsQuery,
) => {
  const limit = query.limit ?? 20;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(query.cursor
        ? {
            createdAt: {
              lt: (
                await prisma.notification.findUnique({
                  where: { id: query.cursor },
                  select: { createdAt: true },
                })
              )?.createdAt,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const page = hasMore ? notifications.slice(0, limit) : notifications;

  return {
    notifications: page.map(toNotificationResponse),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
};

export const markNotificationAsRead = async (userId: number, id: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification || notification.userId !== userId) {
    throw new ChatError("Notification not found", 404);
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return toNotificationResponse(updated);
};

export const markAllNotificationsAsRead = async (userId: number) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { message: "All notifications marked as read" };
};
