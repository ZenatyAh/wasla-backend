import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validateResource.js";
import { listUserReviewsController } from "../reviews/review.controller.js";
import {
  getProfileController,
  updateProfileController,
} from "./profile.controller.js";
import { deleteAccountController } from "./deleteAccount.controller.js";
import { deleteAccountSchema } from "./deleteAccount.schema.js";
import { updateProfileSchema } from "./profile.schema.js";

const router = Router();

router.use(authMiddleware);

router.delete(
  "/account",
  validate(deleteAccountSchema),
  deleteAccountController,
);
router.put(
  "/profile",
  validate(updateProfileSchema),
  updateProfileController,
);
router.get("/:id/profile", getProfileController);
router.get("/:id/reviews", listUserReviewsController);

export default router;
