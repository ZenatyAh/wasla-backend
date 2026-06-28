import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { listPendingReviewContracts } from "../reviews/review.service.js";
import { createSession } from "./register/create_session.js";
// Function Controller
export const loginService = async (data: any, meta: any) => {
  const { email, password } = data;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deleted_at) {
    throw new Error(`Invalid credentials`);
  }

  const isVaild = await bcrypt.compare(password, user.password_hash);
  if (!isVaild) {
    throw new Error(`Invalid credentials`);
  }

  // if (!user.is_verified) {
  //   throw new Error(`Please verify your email first`);
  // }

  const { refreshToken, accessToken } = await createSession(user.id, meta);
  const pendingReviewContracts = await listPendingReviewContracts(user.id);

  return {
    refreshToken,
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    pendingReviewContracts,
  };
};
