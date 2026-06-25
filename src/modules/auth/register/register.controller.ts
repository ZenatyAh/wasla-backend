import type { Request, Response } from "express";
import { RegisterService } from "./register.service.js";
import { metaExtract } from "../../../common/utils/meta.js";
import type { RegisterInput } from "../auth.schema.js";
import { setRefreshTokenCookie } from "../../../common/utils/cookies.js";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";

export const RegisterControler = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const data: RegisterInput = req.body;
    if (!data) {
      return sendError(res, 400, "Request body is required");
    }

    const { id, email, username, refreshToken, accessToken } =
      await RegisterService(data, meta);

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: { id, email, username },
    });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Register failed"));
  }
};
