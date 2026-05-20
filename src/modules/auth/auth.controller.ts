import type { Response, Request } from "express";
import { loginService } from "./loginService.js";
import { metaExtract } from "../../common/utils/meta.js";
import { setRefreshTokenCookie } from "../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";

export const loginController = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const result = await loginService(req.body, meta);
    setRefreshTokenCookie(res, result.refreshToken);

    return res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Login failed"));
  }
};
