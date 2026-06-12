import cors from "cors";
import express from "express";
import { authMiddleware } from "./common/middleware/auth.middleware.js";
import {
  invalidJsonBodyHandler,
  jsonBodyMiddleware,
} from "./common/middleware/jsonBody.middleware.js";
import { openApiSpec } from "./docs/openapi.js";
import { swaggerHtml } from "./docs/swaggerHtml.js";
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
// import "./types/express.js";

const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://wasla-five.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
]
  .filter((origin): origin is string => Boolean(origin))
  .map(normalizeOrigin);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and allowlisted frontends.
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
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
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/skills", skillRoutes);
app.use("/feed", feedRouter);
app.use("/internal", internalRecommenderRouter);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(invalidJsonBodyHandler);
