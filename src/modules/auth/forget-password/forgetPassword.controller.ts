import { emailSchema } from "../auth.schema.js";
import { forgetPasswordService } from "./forgetPassword.service.js";
export const forgetPasswordControllers = async (req: any, res: any) => {
  try {
    const { email } = req.body;
    const validatedEmail = emailSchema.parse(email);

    const result = await forgetPasswordService(validatedEmail);

    return res
      .status(200)
      .json({ message: "If the email exists, we sent a reset link" });
  } catch (error: any) {
    return res.status(400).json({
      status: "fail",
      message: "بيانات غير صالحة",
      errors: error.errors,
    });
  }
};
