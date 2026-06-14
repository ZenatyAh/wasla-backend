import { getIO } from "./socket-state.js";

export const userRoom = (userId: number) => `user:${userId}`;

const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

export const emitToConversation = (
  conversationId: string,
  event: string,
  payload: unknown,
) => {
  const io = getIO();
  if (!io) {
    return;
  }

  io.to(conversationRoom(conversationId)).emit(event, payload);
};

export const emitToUser = (
  userId: number,
  event: string,
  payload: unknown,
) => {
  const io = getIO();
  if (!io) {
    return;
  }

  io.to(userRoom(userId)).emit(event, payload);
};

export const joinUserRoom = (userId: number, socketId: string): void => {
  const io = getIO();
  if (!io) {
    return;
  }

  const socket = io.sockets.sockets.get(socketId);
  socket?.join(userRoom(userId));
};
