import { prisma } from "../../../lib/prisma.js";

const buildResetUrl = () => {
  const accountPortalUrl = process.env.CLERK_ACCOUNT_PORTAL_URL?.trim();

  if (!accountPortalUrl) {
    return null;
  }

  return `${accountPortalUrl.replace(/\/$/, "")}/reset-password`;
};

export const clerkForgotPasswordService = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deleted_at: true, clerk_user_id: true },
  });

  if (!user || user.deleted_at || !user.clerk_user_id) {
    return { resetUrl: null };
  }

  return { resetUrl: buildResetUrl() };
};
