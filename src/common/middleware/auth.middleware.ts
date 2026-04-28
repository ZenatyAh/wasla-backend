import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/env.js";
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Extract Acceess Token
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
    // verify token
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "401 Invalid or expired token" });
  }
};
