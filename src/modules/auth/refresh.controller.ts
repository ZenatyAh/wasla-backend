import type { Request, Response } from "express";
import { refreshService } from "./refresh.service.js";
import {
  getRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";

export const refreshController = async (req: Request, res: Response) => {
  try {
    const token = getRefreshTokenCookie(req);
    const result = await refreshService(token);

    setRefreshTokenCookie(res, result.refreshToken);

    return res.json({
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    return sendError(res, 403, getErrorMessage(err, "Refresh failed"));
  }
};
