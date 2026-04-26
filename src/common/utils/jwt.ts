import { JWT_SECRET } from "./env.js";
import jwt from "jsonwebtoken";

// function for generate Access token == short token time
export const signAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
};

// function for generate Refresh token == long token time
export const RefreshAccessToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

