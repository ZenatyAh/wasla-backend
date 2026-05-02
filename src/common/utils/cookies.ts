import type { Request, Response } from "express";

export const REFRESH_TOKEN_COOKIE = "refreshToken";
const LEGACY_REFRESH_TOKEN_COOKIE = "refreshtoken";

export const getCookieValue = (req: Request, name: string) => {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  if (cookies?.[name]) {
    return cookies[name];
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

export const getRefreshTokenCookie = (req: Request) =>
  getCookieValue(req, REFRESH_TOKEN_COOKIE) ||
  getCookieValue(req, LEGACY_REFRESH_TOKEN_COOKIE);

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE);
  res.clearCookie(LEGACY_REFRESH_TOKEN_COOKIE);
};
