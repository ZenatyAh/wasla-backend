import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcrypt";
import { createSession } from "./create_session.js";
import type { RegisterInput } from "../auth.schema.js";
import { syncUser } from "../../recommender/recommender.client.js";
import { syncUserSkillsByType } from "../../skills/userSkills.service.js";

export const RegisterService = async (
  data: RegisterInput,
  meta: { deviceInfo: string; ip: string },
) => {
  const {
    username,
    email,
    password,
    full_name,
    bio,
    profile_image,
    location,
    offeredSkills,
    requiredSkills,
  } = data;

  // 2 - email
  const checkEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (checkEmail) {
    throw new Error(`Email already used`);
  }

  // 3 - username
  const checkUserName = await prisma.user.findUnique({
    where: { username },
  });
  if (checkUserName) {
    throw new Error(`Username is already taken`);
  }

  // Hash Password
  const hashPassword = await bcrypt.hash(password, 10);

  // create skills
  const user = await prisma.$transaction(async (tx) => {
    // CREAT User
    const user = await tx.user.create({
      data: {
        full_name,
        username,
        email,
        password_hash: hashPassword,
        bio: bio ?? null,
        profile_image: profile_image ?? null,
        location: location ?? null,
      },
    });

    await syncUserSkillsByType(tx, user.id, offeredSkills, "OFFER");
    await syncUserSkillsByType(tx, user.id, requiredSkills, "REQUEST");

    await tx.transaction.create({
      data: {
        receiver_id: user.id,
        sender_id: null,
        amount: 5,
        transaction_type: "WELCOME_BONUS",
      },
    });

    return user;
  },{timeout: 15000});

  const { refreshToken, accessToken } = await createSession(user.id, meta);
  syncUser(user.id);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    refreshToken,
    accessToken,
  };
};
