import { prisma } from "../../../lib/prisma.js";
import { generateToken } from "../../../common/utils/generateToken.js";
export const forgetPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (user === null) {
    return;
  }
  const { token, tokenHash, expiresAt } = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      expiresAt: expiresAt,
      tokenHash,
    },
  });
};
