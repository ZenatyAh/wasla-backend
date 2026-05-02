import type { Request, Response } from "express";
import { logoutService } from "./logout.service.js";
import {
  clearRefreshTokenCookie,
  getRefreshTokenCookie,
} from "../../common/utils/cookies.js";

export const logoutController = async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenCookie(req);

    if (!refreshToken) {
      return res.status(204).end();
    }

    await logoutService(refreshToken);
    clearRefreshTokenCookie(res);

    return res.status(204).end();
  } catch {
    clearRefreshTokenCookie(res);
    return res.status(204).end();
  }
};
