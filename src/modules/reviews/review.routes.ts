import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validateResource.js";
import { createReviewController } from "./review.controller.js";
import { createReviewSchema } from "./review.schema.js";

const router = Router();

router.use(authMiddleware);

router.post("/", validate(createReviewSchema), createReviewController);

export default router;
