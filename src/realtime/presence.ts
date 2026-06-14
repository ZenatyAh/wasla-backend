import { fireAndForget } from "../common/utils/fireAndForget.js";
import { prisma } from "../lib/prisma.js";
import { emitToUser } from "./emit.js";

/**
 * Debounce window before marking a user offline after their last socket
 * disconnects. If the user reconnects (e.g. page refresh) within this window,
 * the timer is cancelled and no DB write or offline event is emitted.
 */
export const PRESENCE_OFFLINE_DEBOUNCE_MS = Number(
  process.env.PRESENCE_OFFLINE_DEBOUNCE_MS ?? 7_000,
);

const connections = new Map<number, Set<string>>();
const offlineTimers = new Map<number, NodeJS.Timeout>();

export const isUserOnline = (userId: number): boolean =>
  (connections.get(userId)?.size ?? 0) > 0;

/** Test-only helper to reset in-memory presence state. */
export const resetPresenceState = (): void => {
  for (const timer of offlineTimers.values()) {
    clearTimeout(timer);
  }
  connections.clear();
  offlineTimers.clear();
};

const getConversationPartnerIds = async (userId: number): Promise<number[]> => {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: {
      conversation: {
        select: {
          participants: { select: { userId: true } },
        },
      },
    },
  });

  const partnerIds = new Set<number>();
  for (const participation of participations) {
    for (const participant of participation.conversation.participants) {
      if (participant.userId !== userId) {
        partnerIds.add(participant.userId);
      }
    }
  }

  return Array.from(partnerIds);
};

const broadcastPresenceToPartners = async (
  userId: number,
  event: "chat:presence:online" | "chat:presence:offline",
  payload: { userId: number; lastSeen?: Date | null },
) => {
  const partners = await getConversationPartnerIds(userId);
  for (const partnerId of partners) {
    emitToUser(partnerId, event, payload);
  }
};

const markUserOnline = (userId: number) => {
  fireAndForget("presence:online", async () => {
    await prisma.user.updateMany({
      where: { id: userId },
      data: { is_online: true },
    });

    await broadcastPresenceToPartners(userId, "chat:presence:online", {
      userId,
    });
  });
};

const markUserOffline = (userId: number) => {
  fireAndForget("presence:offline", async () => {
    const lastSeen = new Date();

    await prisma.user.updateMany({
      where: { id: userId },
      data: {
        is_online: false,
        last_seen: lastSeen,
      },
    });

    await broadcastPresenceToPartners(userId, "chat:presence:offline", {
      userId,
      lastSeen,
    });
  });
};

export const handleUserConnect = (userId: number, socketId: string): void => {
  const existingTimer = offlineTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    offlineTimers.delete(userId);
  }

  let sockets = connections.get(userId);
  const wasOffline = !sockets || sockets.size === 0;

  if (!sockets) {
    sockets = new Set<string>();
    connections.set(userId, sockets);
  }

  sockets.add(socketId);

  if (wasOffline) {
    markUserOnline(userId);
  }
};

export const handleUserDisconnect = (userId: number, socketId: string): void => {
  const sockets = connections.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(socketId);

  if (sockets.size > 0) {
    return;
  }

  connections.delete(userId);

  const timer = setTimeout(() => {
    offlineTimers.delete(userId);

    if (isUserOnline(userId)) {
      return;
    }

    markUserOffline(userId);
  }, PRESENCE_OFFLINE_DEBOUNCE_MS);

  offlineTimers.set(userId, timer);
};
