import type { Request, Response } from "express";
import { logoutService } from "./logout.service.js";
export const logoutController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(204).end();
    }
    const result = await logoutService(refreshToken);
    res.clearCookie("refreshToken");

    return res.status(204);
  } catch {
    res.status(204);
  }
};
