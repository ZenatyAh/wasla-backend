import { Router } from "express";
import { loginController } from "./auth.controller.js";
import { RegisterControler } from "./Register/Register.controller.js";

const router = Router();
router.post("/login", loginController);
router.post("/register", RegisterControler);

export default router;
