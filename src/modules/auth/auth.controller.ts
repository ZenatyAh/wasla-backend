import type { Response, Request } from "express";
import { loginService } from "./loginService.js";
import { metaExtract } from "../../common/utils/meta.js";
export const loginController = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const result = await loginService(req.body, meta);
    // Set Cookies
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.json({
      access_Token: result.accessToken,
      user: result.user,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Login Faild" });
  }
};
