import type { Request, Response } from "express";
import { RegisterService } from "./Register.service.js";
import { metaExtract } from "../../../common/utils/meta.js";
import type {RegisterInput} from '../auth.schema.js'
export const RegisterControler = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const data : RegisterInput = req.body;
    if (!data) {
      return res.status(400).json({ message: `data Not Found` });
    }
    const { id, email, username, refreshToken, accessToken } =
      await RegisterService(data, meta);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.json({
      access_Token: accessToken,
      user: { id, email, username },
    });
  } catch (err: any) {
    return res.status(400).json({
      message: err.message,
    });
  }
};
