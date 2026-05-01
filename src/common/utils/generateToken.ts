import crypto, { hash } from "crypto";
export const generateToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const expireDate = new Date(Date.now() + 15 * 60 * 1000);
};
