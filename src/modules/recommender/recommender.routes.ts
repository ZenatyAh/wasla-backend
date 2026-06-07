import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth.middleware.js";
import {
  feedController,
  recommenderExportController,
} from "./recommender.controller.js";
import { internalTokenMiddleware } from "./internalAuth.middleware.js";

/** Internal, machine-to-machine endpoint. Not publicly reachable. */
export const internalRecommenderRouter = Router();
internalRecommenderRouter.get(
  "/recommender-export",
  internalTokenMiddleware,
  recommenderExportController,
);

/** User-facing recommended feed proxy. */
export const feedRouter = Router();
feedRouter.get("/:userId", authMiddleware, feedController);
