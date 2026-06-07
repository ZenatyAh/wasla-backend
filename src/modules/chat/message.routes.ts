import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validateResource.js";
import { editMessageSchema } from "./chat.schema.js";
import {
  deleteMessageController,
  editMessageController,
  markMessageReadController,
} from "./message.controller.js";

const router = Router();

router.use(authMiddleware);

router.patch("/:messageId", validate(editMessageSchema), editMessageController);
router.delete("/:messageId", deleteMessageController);
router.post("/:messageId/read", markMessageReadController);

export default router;
