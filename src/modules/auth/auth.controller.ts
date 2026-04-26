import type { Response, Request } from "express";
import { loginService } from "./loginService.js";
import { UAParser } from "ua-parser-js";
import { metaExtract } from "../../common/utils/meta.js";
export const loginController = async (req: Request, res: Response) => {
  try {
    const meta = metaExtract(req);
    const result = await loginService(req.body, meta);
    // Set Cookies
    res.cookie("refreshtoken", result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    return res.json({
      access_Token: result.Accesstoken,
      user: result.user,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Login Faild" });
  }
};
