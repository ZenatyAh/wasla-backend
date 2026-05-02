import { prisma } from "../../lib/prisma.js";
import { createHmac } from "node:crypto";
import { TOKEN_SECRET } from "./env.js";
export const validateResetToken = async (token: string) => {
  const tokenHash = createHmac("sha256", TOKEN_SECRET)
    .update(token)
    .digest("hex");
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken) {
    throw new Error("Invalid token");
  }
  if (resetToken.expiresAt < new Date()) {
    throw new Error("Token expired");
  }
  if (resetToken.usedAt) {
    throw new Error("Token already used");
  }
  return resetToken;
};
