import crypto from "crypto";
import { TOKEN_SECRET } from "./env.js";
export const generateToken = () => {
  const TOKEN_EXPIRES_IN = 15 * 60 * 1000;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(token)
    .digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_IN);
  return { token, tokenHash, expiresAt };
};
