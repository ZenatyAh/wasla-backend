import bcrypt from "bcrypt";
import { createHmac } from "crypto";
import { prisma } from "../../../lib/prisma.js";
import { TOKEN_SECRET } from "../../../common/utils/env.js";

export const resetPasswordService = async (
  token: string,
  newPassword: string,
) => {
  const tokenHash = createHmac("sha256", TOKEN_SECRET)
    .update(token)
    .digest("hex");

  await prisma.$transaction(async (tx) => {
    const result = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new Error("Invalid or expired token");
    }

    const resetToken = await tx.passwordResetToken.findFirst({
      where: { tokenHash },
    });

    if (!resetToken) {
      throw new Error("Invalid or expired token");
    }

    const user = await tx.user.findUnique({
      where: { id: resetToken.userId },
      select: { clerk_user_id: true },
    });

    if (user?.clerk_user_id) {
      throw new Error("Please reset your password through Clerk");
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { password_hash: hashPassword },
    });

    await tx.session.deleteMany({
      where: { user_id: resetToken.userId },
    });
  });
};
