import { rateLimit, ipKeyGenerator } from "express-rate-limit";

export const loginLimite = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  message: "Too many login attempts. Please try again after 1 minute.",
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"];

    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim() || ""
        : req.ip || req.socket.remoteAddress || "unknown";

    return ipKeyGenerator(ip);
  },
});
