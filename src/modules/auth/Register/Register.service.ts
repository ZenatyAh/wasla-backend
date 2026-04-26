import { prisma } from "../../../lib/prisma.js";
import bcrypt from "bcrypt";
import { createSession } from "./create_session.js";
type data = {
  password: string;
  email: string;
  username: string;
  full_name: string;
  bio?: string;
  profile_image?: string;
};
export const RegisterService = async (
  data: data,
  meta: { deviceInfo: string; ip: string },
) => {
  const { username, email, password, full_name, bio, profile_image } = data;
  // Validation
  if (!email || !password || !username) {
    throw new Error(`All fields are required`);
  }
  // 1 - password
  if (!password || password.length < 8) {
    throw new Error(`Password should be at least 8 characters`);
  }
  // 2 - email
  const checkEmail = await prisma.user.findFirst({
    where: { email: email },
  });
  if (checkEmail) {
    throw new Error(`Email already used`);
  }

  // 3 - username
  const checkUserName = await prisma.user.findUnique({
    where: { username: username },
  });
  if (checkUserName) {
    throw new Error(`Username is already taken`);
  }

  // Hash Password
  const hashPassword = await bcrypt.hash(password, 10);

  // CREAT User
  const user = await prisma.user.create({
    data: {
      full_name,
      username,
      email,
      password_hash: hashPassword,
      bio: bio ?? null,
      profile_image: profile_image ?? null,
    },
  });
  const refreshToken = await createSession(user.id, meta);
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
};
