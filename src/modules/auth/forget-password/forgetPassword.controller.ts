import { emailSchema } from "../auth.schema.js";
import { getErrorMessage, sendError } from "../../../common/utils/httpError.js";
import { forgetPasswordService } from "./forgetPassword.service.js";
export const forgetPasswordControllers = async (req: any, res: any) => {
  try {
    const { email } = req.body;
    const validatedEmail = emailSchema.parse(email);

    const result = await forgetPasswordService(validatedEmail);

    return res
      .status(200)
      .json({ message: "If the email exists, we sent a reset link" });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Invalid request data"));
  }
};
