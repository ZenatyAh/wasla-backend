import { getAuth } from "@clerk/express";
import type { Request } from "express";
import { getClerkClient } from "../../../lib/clerk.js";
import { createSession } from "../Register/create_session.js";
import { linkOrCreateUserFromClerk, normalizeClerkUser } from "./clerk.sync.service.js";

export const exchangeClerkSession = async (
  req: Request,
  meta: { deviceInfo: string; ip: string },
) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    throw new Error("Invalid Clerk session");
  }

  const clerkUser = normalizeClerkUser(
    await getClerkClient().users.getUser(auth.userId),
  );
  const user = await linkOrCreateUserFromClerk(clerkUser);

  const { refreshToken, accessToken } = await createSession(user.id, meta);

  return {
    refreshToken,
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
    },
  };
};
