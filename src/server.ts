import cors from "cors";
import express from "express";
import { authMiddleware } from "./common/middleware/auth.middleware.js";
const app = express();
import authroutes from "./modules/auth/auth.routes.js";
// import "./types/express.js";
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Wasla backend is yyy",
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated",
    user: req.user,
  });
});

app.use("/auth", authroutes);

app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

export default app;
