import { prisma } from "../../../lib/prisma.js";

export const forgetPasswordService = async (email: string) => {
  const emailCheck = prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (emailCheck === null) {
    return;
  }
  
};
