import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import {
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "./notification.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listNotificationsController);
router.patch("/read-all", markAllNotificationsReadController);
router.patch("/:id/read", markNotificationReadController);

export default router;
