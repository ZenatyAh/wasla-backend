import cors from "cors";
import express from "express";
import { authMiddleware } from "./common/middleware/auth.middleware.js";
import {
  invalidJsonBodyHandler,
  jsonBodyMiddleware,
} from "./common/middleware/jsonBody.middleware.js";
import { clerkWebhookController } from "./modules/auth/clerk/clerk.webhook.controller.js";
import { chatFrontendHtml } from "./docs/chatFrontendHtml.js";
import { openApiSpec } from "./docs/openapi.js";
import { swaggerHtml } from "./docs/swaggerHtml.js";
import { CLERK_ENABLED } from "./common/utils/env.js";
const app = express();
export default app;

import authroutes from "./modules/auth/auth.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import exchangeRoutes from "./modules/exchanges/exchanges.routes.js";
import messageRoutes from "./modules/chat/message.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import postRoutes from "./modules/posts/posts.routes.js";
import {
  feedRouter,
  internalRecommenderRouter,
} from "./modules/recommender/recommender.routes.js";
import reviewRoutes from "./modules/reviews/review.routes.js";
import skillRoutes from "./modules/skills/skills.routes.js";
import userRoutes from "./modules/users/users.routes.js";
import walletRoutes from "./modules/wallet/wallet.routes.js";
// import "./types/express.js";

app.use(
  cors({
    // TEMPORARY: reflect any Origin so frontend integration is not blocked by CORS.
    // Re-enable an allowlist before production hardening.
    origin: true,
    credentials: true,
  }),
);
if (CLERK_ENABLED) {
  app.post(
    "/webhooks/clerk",
    express.raw({ type: "application/json" }),
    clerkWebhookController,
  );
}
app.use(...jsonBodyMiddleware);
app.set("trust proxy", 1);
app.get("/", (_req, res) => {
  res.json({
    message: "Wasla backend is running , Ahmed Zenaty Here",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/docs/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

app.get("/docs", (_req, res) => {
  res.type("html").send(swaggerHtml);
});

app.get("/docs/chat-frontend", (_req, res) => {
  res.type("html").send(chatFrontendHtml);
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: (req as express.Request & { user?: unknown }).user,
  });
});

app.use("/auth", authroutes);
app.use("/posts", postRoutes);
app.use("/exchanges", exchangeRoutes);
app.use("/conversations", chatRoutes);
app.use("/messages", messageRoutes);
app.use("/notifications", notificationRoutes);
app.use("/users", userRoutes);
app.use("/reviews", reviewRoutes);
app.use("/skills", skillRoutes);
app.use("/feed", feedRouter);
app.use("/internal", internalRecommenderRouter);
app.use("/api/v1/wallet", walletRoutes);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(invalidJsonBodyHandler);
