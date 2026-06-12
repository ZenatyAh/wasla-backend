import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcrypt";
import { createSession } from "./create_session.js";
import type { RegisterInput } from "../auth.schema.js";

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

    for (const skillName of offeredSkills) {
      const skill = await tx.skill.upsert({
        where: { skill_name: skillName },
        update: {},
        create: { skill_name: skillName },
      });

      await tx.userSkill.upsert({
        where: {
          user_id_skill_id_skill_type: {
            user_id: user.id,
            skill_id: skill.id,
            skill_type: "OFFER",
          },
        },
        update: {},
        create: {
          user_id: user.id,
          skill_id: skill.id,
          skill_type: "OFFER",
        },
      });
    }

    for (const skillName of requiredSkills) {
      const skill = await tx.skill.upsert({
        where: { skill_name: skillName },
        update: {},
        create: { skill_name: skillName },
      });

      await tx.userSkill.upsert({
        where: {
          user_id_skill_id_skill_type: {
            user_id: user.id,
            skill_id: skill.id,
            skill_type: "REQUEST",
          },
        },
        update: {},
        create: {
          user_id: user.id,
          skill_id: skill.id,
          skill_type: "REQUEST",
        },
      });
    }
    return user;
  },{timeout: 15000});

  const { refreshToken, accessToken } = await createSession(user.id, meta);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    refreshToken,
    accessToken,
  };
};
