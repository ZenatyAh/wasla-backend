import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validateResource.js";
import {
  createSkillController,
  listSkillsController,
} from "./skills.controller.js";
import { createSkillSchema } from "./skills.schema.js";

const router = Router();

router.get("/", listSkillsController);
router.post(
  "/",
  authMiddleware,
  validate(createSkillSchema),
  createSkillController,
);

export default router;
