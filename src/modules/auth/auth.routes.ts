import { Router } from "express";
import { loginController } from "./auth.controller.js";
import { RegisterControler } from "./Register/Register.controller.js";
import { registerSchema, loginschema } from "./auth.schema.js";
import validate from "../../common/middleware/validateResource.js";
import { loginLimite } from "../../common/middleware/ratelimi.js";
const router = Router();
router.post("/login", loginLimite, validate(loginschema), loginController);
router.post("/register", validate(registerSchema), RegisterControler);

export default router;
