import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (server: Server | null): void => {
  io = server;
};

export const getIO = (): Server | null => io;
