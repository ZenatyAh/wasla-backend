import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma } from "./src/lib/prisma.js";

const runId = Date.now().toString();
const password = "TestPass@123";

(async () => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const provider = await prisma.user.create({
      data: {
        full_name: "Profile Provider",
        username: `profile_provider_${runId}`,
        email: `profile_provider_${runId}@test.com`,
        password_hash: passwordHash,
        bio: "Provider bio text",
        available_balance: 10,
      },
    });

    console.log("Provider created:", provider.id);
  } catch (err) {
    console.error("Before hook error:", err);
  }
  process.exit(0);
})();
