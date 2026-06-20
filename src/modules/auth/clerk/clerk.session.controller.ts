import type { Request, Response } from "express";
import { setRefreshTokenCookie } from "../../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";
import { metaExtract } from "../../../common/utils/meta.js";
import { exchangeClerkSession } from "./clerk.session.service.js";

export const clerkSessionController = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const result = await exchangeClerkSession(req, meta);

    setRefreshTokenCookie(res, result.refreshToken);

    return res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err, "Clerk session exchange failed");

    if (message === "Invalid Clerk session") {
      return sendError(res, 401, message);
    }

    return sendError(res, 400, message);
  }
};
