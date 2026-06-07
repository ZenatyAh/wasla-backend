import type { Request } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

export const messageRateLimit = (limit: number, time: number) =>
  rateLimit({
    windowMs: time,
    limit,
    message: "Too many messages. Please slow down.",
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const userId = Number(req.user?.userId);
      if (Number.isInteger(userId)) {
        return `message-user-${userId}`;
      }

      const forwarded = req.headers["x-forwarded-for"];
      const ip =
        typeof forwarded === "string"
          ? forwarded.split(",")[0]?.trim() || ""
          : req.ip || req.socket.remoteAddress || "unknown";

      return ipKeyGenerator(ip);
    },
  });

export const loginLimite = (limit: number, time: number) =>
  rateLimit({
    windowMs: time,
    limit: limit,
    message: `Too many login attempts. Please try again after ${time / 1000 / 60} minute.`,
    standardHeaders: true,
    legacyHeaders: false,

    keyGenerator: (req) => {
      const forwarded = req.headers["x-forwarded-for"];

      const ip =
        typeof forwarded === "string"
          ? forwarded.split(",")[0]?.trim() || ""
          : req.ip || req.socket.remoteAddress || "unknown";

      return ipKeyGenerator(ip);
    },
  });
