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
// import "./types/express.js";
app.use(cors());
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

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use(invalidJsonBodyHandler);

export default app;
