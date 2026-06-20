import { Router } from "express";
import { loginController } from "./auth.controller.js";
import { RegisterControler } from "./Register/Register.controller.js";
import {
  registerSchema,
  loginschema,
  resetPasswordSchema,
  clerkForgotPasswordSchema,
} from "./auth.schema.js";
import validate from "../../common/middleware/validateResource.js";
import { loginLimite } from "../../common/middleware/ratelimi.js";
import { forgetPasswordControllers } from "./forget-password/forgetPassword.controller.js";
import { resetPasswordController } from "./forget-password/resetPassword.controller.js";
import { logoutController } from "./logout.controller.js";
import { refreshController } from "./refresh.controller.js";
import { clerkAuthMiddleware } from "../../common/middleware/clerk.middleware.js";
import { clerkSessionController } from "./clerk/clerk.session.controller.js";
import { clerkForgotPasswordController } from "./clerk/clerk.password.controller.js";
import {
  CLERK_FORGOT_PASSWORD_ENABLED,
  CLERK_SESSION_ENABLED,
} from "../../common/utils/env.js";

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
if (CLERK_SESSION_ENABLED) {
  router.post("/clerk/session", clerkAuthMiddleware, clerkSessionController);
}
if (CLERK_FORGOT_PASSWORD_ENABLED) {
  router.post(
    "/clerk/forgot-password",
    loginLimite(3, 1000),
    validate(clerkForgotPasswordSchema),
    clerkForgotPasswordController,
  );
}
router.post("/refresh", refreshController);
router.post("/logout", logoutController);

export default router;
