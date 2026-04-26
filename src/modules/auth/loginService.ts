import { prisma } from "../../lib/prisma.js";
import { signAccessToken, RefreshAccessToken } from "../../common/utils/jwt.js";
import bcrypt from "bcrypt";
import { createSession } from "./Register/create_session.js";
// Function Controller
export const loginService = async (data: any, meta: any) => {
  const { email, password } = data;

  // 1. Validation
  if (!email || !password) {
    // return res
    //   .status(400)
    //   .json({ message: "Email and password are required" });
    throw new Error("Email and password are required");
  }
  // 2. Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // return res.status(400).json({ meesage: `Invalid credentials` });
    throw new Error(`Invalid credentials`);
  }

  // 3. Check password
  const isVaild = await bcrypt.compare(password, user.password_hash);
  if (!isVaild) {
    // return res.status(400).json({ meesage: `Invalid credentials` });
    throw new Error(`Invalid credentials`);
  }

  // 4. Check email verification
  if (!user.is_verfied) {
    // return res
    //   .status(403)
    //   .json({ message: `Please verify your email first` });
    throw new Error(`Please verify your email first`);
  }

  // 5. Generate tokens
  const Accesstoken = await signAccessToken(user.id.toString());
  const refreshToken = await createSession(user.id, meta);

  // Send data for controllers
  return {
    Accesstoken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      Username: user.username,
    },
  };
};
