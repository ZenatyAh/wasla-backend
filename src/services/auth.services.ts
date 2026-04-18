import { prisma } from "../lib/prisma.js";

type User = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  password_hash: string;
};

export const registerUser = async (userData: User) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: userData.username,
          full_name: userData.full_name,
          email: userData.email,
          password_hash: userData.password_hash,
        },
      });

      await tx.transaction.create({
        data: {
          receiver_id: newUser.id,
          amount: 5,
          transaction_type: "WELCOME_BONUS",
        },
      });
      return newUser;
    });

    return result;
  } catch {
    throw new Error("Registration failed");
  }
};
