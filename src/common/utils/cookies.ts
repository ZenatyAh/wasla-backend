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

const refreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  // Cross-origin frontends (e.g. Vercel) need SameSite=None in production.
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as
    | "lax"
    | "none",
});

export const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions());
};

export const clearRefreshTokenCookie = (res: Response) => {
  const options = refreshTokenCookieOptions();
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
  res.clearCookie(LEGACY_REFRESH_TOKEN_COOKIE, options);
};
