import bcrypt from "bcrypt";
import { prisma } from "../../../lib/prisma.js";

export const changePasswordService = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
    },
  });

  if (!user || user.deleted_at) {
    throw new Error("User not found");
  }

  const isValidPassword = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );
  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  const hashPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashPassword },
    }),
    prisma.session.deleteMany({ where: { user_id: userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
  ]);
};
