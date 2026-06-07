import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import validate from "../../common/middleware/validateResource.js";
import {
  acceptExchangeController,
  cancelExchangeController,
  confirmExchangeController,
  createExchangeController,
  deliverExchangeController,
  disputeExchangeController,
  getExchangeByIdController,
  listExchangesController,
  rejectExchangeController,
} from "./exchanges.controller.js";
import { createExchangeSchema } from "./exchanges.schema.js";

const router = Router();

router.use(authMiddleware);

router.post("/request", validate(createExchangeSchema), createExchangeController);
router.get("/", listExchangesController);
router.get("/:id", getExchangeByIdController);
router.put("/:id/accept", acceptExchangeController);
router.put("/:id/reject", rejectExchangeController);
router.put("/:id/deliver", deliverExchangeController);
router.put("/:id/confirm", confirmExchangeController);
router.put("/:id/cancel", cancelExchangeController);
router.post("/:id/dispute", disputeExchangeController);

export default router;
