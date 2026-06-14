import type { MessageStatus } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { assertConversationParticipant } from "../modules/chat/chat.guard.js";
import { emitToConversation } from "./emit.js";

/**
 * Coalesce rapid DELIVERED/READ ack bursts into a single DB round-trip per
 * conversation recipient. Tune via STATUS_BATCH_DEBOUNCE_MS (default 500ms).
 */
export const STATUS_BATCH_DEBOUNCE_MS = Number(
  process.env.STATUS_BATCH_DEBOUNCE_MS ?? 500,
);

type StatusUpdatePayload = {
  messageId: string;
  status: MessageStatus;
  deliveredAt?: Date | null;
  readAt?: Date | null;
};

type PendingBatch = {
  delivered: Set<string>;
  read: Set<string>;
  timer: NodeJS.Timeout | null;
};

const pendingByKey = new Map<string, PendingBatch>();

const batchKey = (conversationId: string, userId: number) =>
  `${conversationId}:${userId}`;

const getOrCreateBatch = (key: string): PendingBatch => {
  let batch = pendingByKey.get(key);
  if (!batch) {
    batch = { delivered: new Set(), read: new Set(), timer: null };
    pendingByKey.set(key, batch);
  }
  return batch;
};

const emitStatusUpdates = (
  conversationId: string,
  updates: StatusUpdatePayload[],
) => {
  if (updates.length === 0) {
    return;
  }

  emitToConversation(conversationId, "chat:messages:status", {
    conversationId,
    updates,
  });
};

export const flushMessageStatusBatch = async (
  userId: number,
  conversationId: string,
): Promise<StatusUpdatePayload[]> => {
  const key = batchKey(conversationId, userId);
  const batch = pendingByKey.get(key);
  if (!batch) {
    return [];
  }

  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }

  const deliveredIds = Array.from(batch.delivered);
  const readIds = Array.from(batch.read);
  batch.delivered.clear();
  batch.read.clear();
  pendingByKey.delete(key);

  if (deliveredIds.length === 0 && readIds.length === 0) {
    return [];
  }

  await assertConversationParticipant(conversationId, userId);

  const updates: StatusUpdatePayload[] = [];
  const now = new Date();

  if (deliveredIds.length > 0) {
    await prisma.message.updateMany({
      where: {
        id: { in: deliveredIds },
        conversationId,
        senderId: { not: userId },
        status: "SENT",
      },
      data: {
        status: "DELIVERED",
        deliveredAt: now,
      },
    });

    const deliveredMessages = await prisma.message.findMany({
      where: {
        id: { in: deliveredIds },
        conversationId,
        status: "DELIVERED",
      },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
      },
    });

    for (const message of deliveredMessages) {
      updates.push({
        messageId: message.id,
        status: message.status,
        deliveredAt: message.deliveredAt,
      });
    }
  }

  if (readIds.length > 0) {
    await prisma.message.updateMany({
      where: {
        id: { in: readIds },
        conversationId,
        senderId: { not: userId },
        status: { in: ["SENT", "DELIVERED"] },
      },
      data: {
        status: "READ",
        readAt: now,
        deliveredAt: now,
      },
    });

    await prisma.messageReadReceipt.createMany({
      data: readIds.map((messageId) => ({
        messageId,
        userId,
      })),
      skipDuplicates: true,
    });

    const readMessages = await prisma.message.findMany({
      where: {
        id: { in: readIds },
        conversationId,
        status: "READ",
      },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
        readAt: true,
      },
    });

    for (const message of readMessages) {
      updates.push({
        messageId: message.id,
        status: message.status,
        deliveredAt: message.deliveredAt,
        readAt: message.readAt,
      });
    }
  }

  emitStatusUpdates(conversationId, updates);
  return updates;
};

const scheduleBatchFlush = (userId: number, conversationId: string) => {
  const key = batchKey(conversationId, userId);
  const batch = getOrCreateBatch(key);

  if (batch.timer) {
    clearTimeout(batch.timer);
  }

  batch.timer = setTimeout(() => {
    void flushMessageStatusBatch(userId, conversationId).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[message-status-batch] flush failed: ${message}`);
    });
  }, STATUS_BATCH_DEBOUNCE_MS);
};

export const enqueueDeliveredMessages = (
  userId: number,
  conversationId: string,
  messageIds: string[],
) => {
  if (messageIds.length === 0) {
    return;
  }

  const batch = getOrCreateBatch(batchKey(conversationId, userId));
  for (const messageId of messageIds) {
    batch.delivered.add(messageId);
  }
  scheduleBatchFlush(userId, conversationId);
};

export const enqueueReadMessages = (
  userId: number,
  conversationId: string,
  messageIds: string[],
) => {
  if (messageIds.length === 0) {
    return;
  }

  const batch = getOrCreateBatch(batchKey(conversationId, userId));
  for (const messageId of messageIds) {
    batch.read.add(messageId);
    batch.delivered.delete(messageId);
  }
  scheduleBatchFlush(userId, conversationId);
};

/** Immediate read processing for REST POST /messages/:id/read. */
export const processReadMessagesSync = async (
  userId: number,
  conversationId: string,
  messageIds: string[],
) => {
  const batch = getOrCreateBatch(batchKey(conversationId, userId));
  for (const messageId of messageIds) {
    batch.read.add(messageId);
    batch.delivered.delete(messageId);
  }

  return flushMessageStatusBatch(userId, conversationId);
};

/** Test-only helper to reset pending batches. */
export const resetMessageStatusBatches = (): void => {
  for (const batch of pendingByKey.values()) {
    if (batch.timer) {
      clearTimeout(batch.timer);
    }
  }
  pendingByKey.clear();
};
