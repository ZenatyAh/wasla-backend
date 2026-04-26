import { prisma } from "../../lib/prisma.js";

export const logoutService = async (token: string) => {
  await prisma.session.deleteMany({ where: { refresh_token: token } });
};
