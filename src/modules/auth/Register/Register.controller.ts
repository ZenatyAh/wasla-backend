import type { Request, Response } from "express";
import { RegisterService } from "./Register.service.js";
import { createSession } from "./create_session.js";
import { metaExtract } from "../../../common/utils/meta.js";

export const RegisterControler = async (req: Request, res: Response) => {
  try {
    const meta = await metaExtract(req);
    const data = req.body;
    if (!data) {
      res.status(400).json({ message: `data Not Found` });
    }
    const result = await RegisterService(data, meta);
    return res.status(200).json({
      message: "Validation passed",
    });
  } catch (err: any) {
    return res.status(400).json({
      message: err.message,
    });
  }
};
