import rateLimit from "express-rate-limit";
export const loginLimite = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: "Too many login attempts. Please try again after 1 minute.",
  standardHeaders: true,
  legacyHeaders: false,
});
