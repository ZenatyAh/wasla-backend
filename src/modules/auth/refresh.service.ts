import { JWT_SECRET } from "../../common/utils/env.js";
import jwt from "jsonwebtoken";
import { signAccessToken, RefreshAccessToken } from "../../common/utils/jwt.js";
import { prisma } from "../../lib/prisma.js";
export const refreshService = async (refreshToken?: string) => {
  // 1 - check if refreshToken found
  if (!refreshToken) {
    throw new Error(`No refresh token`);
  }

  // 2 - verify JWT
  let payload: any;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET);
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

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};
