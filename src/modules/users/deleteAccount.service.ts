import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";

const ACTIVE_EXCHANGE_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_CONFIRMATION",
  "DISPUTED",
] as const;

export const deleteAccountService = async (
  userId: number,
  password: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
      escrow_balance: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.deleted_at) {
    throw new Error("Account already deleted");
  }

  if (user.escrow_balance > 0) {
    throw new Error("Cannot delete account while credits are held in escrow");
  }

  const activeExchangeCount = await prisma.serviceExchange.count({
    where: {
      OR: [{ provider_id: userId }, { consumer_id: userId }],
      status: { in: [...ACTIVE_EXCHANGE_STATUSES] },
    },
  });

  if (activeExchangeCount > 0) {
    throw new Error("Cannot delete account with active service exchanges");
  }

  if (user.password_hash) {
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error("Invalid password");
    }
  }

  const deletedAt = new Date();
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const unusablePasswordHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("hex"),
    10,
  );

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { user_id: userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        deleted_at: deletedAt,
        email: `deleted_${userId}_${deletedAt.getTime()}@deleted.wasla.local`,
        username: `deleted_${userId}_${randomSuffix}`,
        full_name: "Deleted User",
        password_hash: unusablePasswordHash,
        bio: null,
        profile_image: null,
        location: null,
        available_balance: 0,
      },
    }),
  ]);
};
