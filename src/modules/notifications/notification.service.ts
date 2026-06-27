import { prisma } from "../../lib/prisma.js";
import { type NotificationType } from "../../generated/prisma/client.js";
import { sendMessageEmail } from "../../common/utils/sendMessageEmail.js";
import { emitToUser } from "../../realtime/emit.js";
import { ChatError } from "../chat/chat.errors.js";
import type { ListNotificationsQuery } from "./notification.schema.js";

const CONTRACT_NOTIFICATION_TYPES = new Set<NotificationType>([
  "EXCHANGE_REQUESTED",
  "EXCHANGE_ACCEPTED",
  "EXCHANGE_REJECTED",
  "EXCHANGE_CANCELED",
  "SESSION_RECORDED",
  "SESSION_CONFIRMED",
  "SESSION_REJECTED",
  "DEADLINE_PROPOSED",
  "DEADLINE_APPROVED",
  "DEADLINE_REJECTED",
  "DEADLINE_APPROACHING",
  "CONTRACT_AUTO_RESOLVED",
  "CONTRACT_AUTO_COMPLETED",
  "CONTRACT_AUTO_DISPUTED",
  "CONTRACT_RESOLUTION_FAILED",
]);

export type ContractNotificationMetadata = {
  contractEndDate?: Date | string | null;
  proposedEndDate?: Date | string | null;
  status?: string | null;
  fault?: string | null;
  providerCredits?: number | null;
  refundCredits?: number | null;
};

const toIsoDate = (value: Date | string | null | undefined) => {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

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

  if (CONTRACT_NOTIFICATION_TYPES.has(notification.type as NotificationType)) {
    emitToUser(userId, "contract:notification:new", notification);
  }
};

const buildContractNotificationData = async (
  contractId: number,
  metadata?: ContractNotificationMetadata,
) => {
  if (metadata) {
    return {
      contractId,
      contractEndDate: toIsoDate(metadata.contractEndDate),
      proposedEndDate: toIsoDate(metadata.proposedEndDate),
      status: metadata.status ?? null,
      fault: metadata.fault ?? null,
      providerCredits: metadata.providerCredits ?? null,
      refundCredits: metadata.refundCredits ?? null,
    };
  }

  try {
    const exchange = await prisma.serviceExchange.findUnique({
      where: { id: contractId },
      select: {
        maximum_end_date: true,
        proposed_end_date: true,
        status: true,
      },
    });

    return {
      contractId,
      contractEndDate: toIsoDate(exchange?.maximum_end_date),
      proposedEndDate: toIsoDate(exchange?.proposed_end_date),
      status: exchange?.status ?? null,
    };
  } catch (error) {
    console.error("[ContractNotification] metadata lookup failed", {
      contractId,
      error: error instanceof Error ? error.message : error,
    });

    return {
      contractId,
      contractEndDate: null,
      proposedEndDate: null,
      status: null,
    };
  }
};

export const logContractNotificationFailure = (
  input: {
    type: NotificationType;
    contractId: number;
    recipientId: number;
  },
  error: unknown,
) => {
  console.error("[ContractNotification] failed", {
    type: input.type,
    contractId: input.contractId,
    recipientId: input.recipientId,
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
  });
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
  contractEndDate?: Date | string | null;
  proposedEndDate?: Date | string | null;
  status?: string | null;
  fault?: string | null;
  providerCredits?: number | null;
  refundCredits?: number | null;
}) => {
  const data = await buildContractNotificationData(input.contractId, {
    contractEndDate: input.contractEndDate,
    proposedEndDate: input.proposedEndDate,
    status: input.status,
    fault: input.fault,
    providerCredits: input.providerCredits,
    refundCredits: input.refundCredits,
  });

  const notification = await prisma.notification.create({
    data: {
      userId: input.recipientId,
      type: input.type,
      title: input.title,
      body: input.body,
      data,
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
