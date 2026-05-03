import { Router } from "express";
import { loginController } from "./auth.controller.js";
import { RegisterControler } from "./Register/Register.controller.js";
import {
  registerSchema,
  loginschema,
  resetPasswordSchema,
} from "./auth.schema.js";
import validate from "../../common/middleware/validateResource.js";
import { loginLimite } from "../../common/middleware/ratelimi.js";
import { forgetPasswordControllers } from "./forget-password/forgetPassword.controller.js";
import { resetPasswordController } from "./forget-password/resetPassword.controller.js";
import { logoutController } from "./logout.controller.js";
import { refreshController } from "./refresh.controller.js";
const router = Router();
router.post(
  "/login",
  loginLimite(5, 60 * 1000),
  validate(loginschema),
  loginController,
);
router.post("/register", validate(registerSchema), RegisterControler);
router.post(
  "/forget-password",
  loginLimite(3, 1000),
  forgetPasswordControllers,
);
router.post(
  "/reset-password",
  loginLimite(5, 1000),
  validate(resetPasswordSchema),
  resetPasswordController,
);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);
export default router;
