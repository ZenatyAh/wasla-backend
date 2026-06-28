import {
  signAccessToken,
  RefreshAccessToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.js";
import { prisma } from "../../lib/prisma.js";
import { listPendingReviewContracts } from "../reviews/review.service.js";

export const refreshService = async (refreshToken?: string) => {
  // 1 - check if refreshToken found
  if (!refreshToken) {
    throw new Error(`No refresh token`);
  }

  // 2 - verify JWT (refresh type only)
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error(`Invalid or expired refresh token`);
  }

  // 3 - check session in DB
  const session = await prisma.session.findFirst({
    where: { refresh_token: refreshToken },
  });

  if (!session) {
    throw new Error(`Session Not Found`);
  }
  // 4 - check expiration (extra layer)
  if (new Date() > session.expires_at) {
    throw new Error("Session expired");
  }

  // 5 - generate new tokens (ROTATION)
  const newAccessToken = signAccessToken(payload.userId);
  const newRefreshToken = RefreshAccessToken(payload.userId);

  //   6 - update session (invalidate old token)
  await prisma.session.update({
    where: { id: session.id },
    data: {
      refresh_token: newRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const userId = Number(payload.userId);
  const pendingReviewContracts = await listPendingReviewContracts(userId);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    pendingReviewContracts,
  };
};
