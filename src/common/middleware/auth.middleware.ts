import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith(`Bearer `)) {
      token = authHeader.split(" ")[1];
    } else {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!token) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const payload = verifyAccessToken(token);
    const userId = Number(payload.userId);
    if (!Number.isInteger(userId)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deleted_at: true },
    });

    if (!user || user.deleted_at) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = { userId: payload.userId };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
