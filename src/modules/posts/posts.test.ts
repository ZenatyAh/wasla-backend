import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Posts API", () => {
    it("skips when DATABASE_URL and JWT_SECRET are not configured", () => {
      assert.ok(true);
    });
  });
} else {
  const bcrypt = (await import("bcrypt")).default;
  const request = (await import("supertest")).default;
  const { signAccessToken } = await import("../../common/utils/jwt.js");
  const { prisma } = await import("../../lib/prisma.js");
  const { default: app } = await import("../../server.js");

  const runId = Date.now().toString();
  const password = "TestPass@123";

  let userId = 0;
  let token = "";

  describe("Posts API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Posts Test User",
          username: `posts_user_${runId}`,
          email: `posts_user_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));
    });

    after(async () => {
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("returns 404 when deleting a non-existent post", async () => {
      const response = await request(app)
        .delete("/posts/999999")
        .set({ Authorization: `Bearer ${token}` });

      assert.equal(response.status, 404);
      assert.equal(response.body.message, "Post not found");
    });
  });
}
