import { v4 as uuidv4 } from "uuid";
import { prisma } from "../../../lib/prisma.js";
import { RefreshAccessToken } from "../../../common/utils/jwt.js";
export const createSession = async (userId: number, meta: any) => {
  try {
    // 5. Generate tokens
    const RefreshToken = RefreshAccessToken(userId.toString());

    await prisma.session.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        refresh_token: RefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_info: meta.deviceInfo,
        updated_at: new Date(),
        ip_address: meta.ip,
      },
    });
    return RefreshAccessToken;
  } catch (err: any) {
    throw new Error("Login Faild");
  }
};
