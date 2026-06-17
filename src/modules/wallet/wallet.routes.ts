import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import { listWalletHistoryController } from "./wallet.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/history", listWalletHistoryController);

export default router;
