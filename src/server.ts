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
import postRoutes from "./modules/posts/posts.routes.js";
// import "./types/express.js";

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and allowlisted frontends.
      if (!origin || allowedOrigins.includes(origin)) {
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

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(invalidJsonBodyHandler);
