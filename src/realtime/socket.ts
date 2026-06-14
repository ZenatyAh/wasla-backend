import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../common/utils/jwt.js";
import { prisma } from "../lib/prisma.js";
import { joinUserRoom } from "./emit.js";
import {
  enqueueDeliveredMessages,
  enqueueReadMessages,
} from "./message-status.batch.js";
import { handleUserConnect, handleUserDisconnect } from "./presence.js";
import { setIO } from "./socket-state.js";

export { emitToConversation, emitToUser } from "./emit.js";
export { getIO } from "./socket-state.js";

/**
 * Heartbeat configuration (Socket.IO engine-level ping/pong):
 * - pingInterval: server sends a ping every 10s
 * - pingTimeout: connection is dropped if no pong within 5s
 * Dead connections are cleaned up automatically without app-level handlers.
 */
const SOCKET_PING_INTERVAL_MS = 10_000;
const SOCKET_PING_TIMEOUT_MS = 5_000;

const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingInterval: SOCKET_PING_INTERVAL_MS,
    pingTimeout: SOCKET_PING_TIMEOUT_MS,
  });

  setIO(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = verifyAccessToken(token);
      socket.data.userId = Number(payload.userId);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = Number(socket.data.userId);

    if (Number.isInteger(userId)) {
      joinUserRoom(userId, socket.id);
      handleUserConnect(userId, socket.id);
    }

    socket.on("chat:join", async (payload: { conversationId?: string }) => {
      try {
        const conversationId = payload?.conversationId;

        if (!conversationId || !Number.isInteger(userId)) {
          socket.emit("chat:error", {
            code: "INVALID_PAYLOAD",
            message: "conversationId is required",
          });
          return;
        }

        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
        });

        if (!participant) {
          socket.emit("chat:error", {
            code: "FORBIDDEN",
            message: "You do not have access to this conversation",
          });
          return;
        }

        await socket.join(conversationRoom(conversationId));
      } catch {
        socket.emit("chat:error", {
          code: "JOIN_FAILED",
          message: "Failed to join conversation",
        });
      }
    });

    socket.on("chat:leave", (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (conversationId) {
        socket.leave(conversationRoom(conversationId));
      }
    });

    socket.on(
      "chat:messages:delivered",
      (payload: { conversationId?: string; messageIds?: string[] }) => {
        const conversationId = payload?.conversationId;
        const messageIds = payload?.messageIds;

        if (
          !conversationId ||
          !Array.isArray(messageIds) ||
          messageIds.length === 0 ||
          !Number.isInteger(userId)
        ) {
          socket.emit("chat:error", {
            code: "INVALID_PAYLOAD",
            message: "conversationId and messageIds are required",
          });
          return;
        }

        enqueueDeliveredMessages(userId, conversationId, messageIds);
      },
    );

    socket.on(
      "chat:messages:read",
      (payload: { conversationId?: string; messageIds?: string[] }) => {
        const conversationId = payload?.conversationId;
        const messageIds = payload?.messageIds;

        if (
          !conversationId ||
          !Array.isArray(messageIds) ||
          messageIds.length === 0 ||
          !Number.isInteger(userId)
        ) {
          socket.emit("chat:error", {
            code: "INVALID_PAYLOAD",
            message: "conversationId and messageIds are required",
          });
          return;
        }

        enqueueReadMessages(userId, conversationId, messageIds);
      },
    );

    socket.on("disconnect", () => {
      if (Number.isInteger(userId)) {
        handleUserDisconnect(userId, socket.id);
      }
    });
  });

  return io;
};
