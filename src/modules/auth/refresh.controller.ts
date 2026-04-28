import type { Request, Response } from "express";
import { refreshService } from "./refresh.service.js";
export const refreshController = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshtoken;
    const result = await refreshService(token);

    // set new cookie
    res.cookie("refreshtoken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.json({
        accessToken : result.accessToken
    })
  } catch (err: any) {
    return res.status(403).json({
      message: err.message || "Refresh failed",
    });
  }
};
