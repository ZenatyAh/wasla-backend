import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../common/utils/jwt.js";
import { prisma } from "../lib/prisma.js";

let io: Server | null = null;

const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

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
    socket.on("chat:join", async (payload: { conversationId?: string }) => {
      try {
        const userId = Number(socket.data.userId);
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
  });

  return io;
};

export const getIO = () => io;

export const emitToConversation = (
  conversationId: string,
  event: string,
  payload: unknown,
) => {
  if (!io) {
    return;
  }

  io.to(conversationRoom(conversationId)).emit(event, payload);
};
