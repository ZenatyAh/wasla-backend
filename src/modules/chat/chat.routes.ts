import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { messageRateLimit } from "../../common/middleware/ratelimi.js";
import validate from "../../common/middleware/validateResource.js";
import {
  createConversationController,
  createDirectConversationController,
  getConversationController,
  listConversationsController,
  listMessagesController,
  sendMessageController,
} from "./chat.controller.js";
import {
  createConversationSchema,
  createDirectConversationSchema,
  sendMessageSchema,
} from "./chat.schema.js";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createConversationSchema), createConversationController);
router.post(
  "/direct",
  validate(createDirectConversationSchema),
  createDirectConversationController,
);
router.get("/", listConversationsController);
router.get("/:conversationId", getConversationController);
router.get("/:conversationId/messages", listMessagesController);
router.post(
  "/:conversationId/messages",
  messageRateLimit(30, 60 * 1000),
  validate(sendMessageSchema),
  sendMessageController,
);

export default router;
