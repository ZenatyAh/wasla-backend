import { prisma } from "../../../lib/prisma.js";
import { generateToken } from "../../../common/utils/generateToken.js";
import { sendResetEmail } from "../../../common/utils/sendResetEmail.js";
export const forgetPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user || user.deleted_at) {
    return;
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  const { token, tokenHash, expiresAt } = generateToken();

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      expiresAt: expiresAt,
      tokenHash,
    },
  });
  sendResetEmail(user.email, token).catch((err) => {
    console.error("[forget-password] Failed to send reset email", {
      email: user.email,
      message: err instanceof Error ? err.message : err,
    });
  });
};
