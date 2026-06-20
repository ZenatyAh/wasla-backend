import { randomUUID } from "crypto";
import { JWT_SECRET } from "./env.js";
import jwt from "jsonwebtoken";

export const JWT_TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
} as const;

export type JwtTokenType = (typeof JWT_TOKEN_TYPES)[keyof typeof JWT_TOKEN_TYPES];

export type JwtPayload = {
  userId: string;
  type: JwtTokenType;
};

export const signAccessToken = (userId: string) => {
  return jwt.sign(
    { userId, type: JWT_TOKEN_TYPES.ACCESS },
    JWT_SECRET,
    { expiresIn: "15m", jwtid: randomUUID() },
  );
};

export const RefreshAccessToken = (userId: string) => {
  return jwt.sign(
    { userId, type: JWT_TOKEN_TYPES.REFRESH },
    JWT_SECRET,
    { expiresIn: "7d", jwtid: randomUUID() },
  );
};

const assertTokenType = (
  payload: jwt.JwtPayload,
  expectedType: JwtTokenType,
): JwtPayload => {
  if (typeof payload.userId !== "string" || payload.type !== expectedType) {
    throw new Error("Invalid token type");
  }

  return { userId: payload.userId, type: expectedType };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  return assertTokenType(payload, JWT_TOKEN_TYPES.ACCESS);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  return assertTokenType(payload, JWT_TOKEN_TYPES.REFRESH);
};
