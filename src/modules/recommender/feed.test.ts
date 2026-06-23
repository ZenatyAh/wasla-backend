import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Feed API", () => {
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
  let postId = 0;
  let token = "";

  describe("Feed API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Feed Test User",
          username: `feed_user_${runId}`,
          email: `feed_user_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));

      const post = await prisma.post.create({
        data: {
          user_id: userId,
          title: "Feed test published post",
          description: "Feed test post description for camelCase response",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 5,
          status: "PUBLISHED",
        },
      });

      postId = post.id;
    });

    after(async () => {
      await prisma.post.deleteMany({ where: { id: postId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("returns camelCase post shape from feed endpoint", async () => {
      const response = await request(app)
        .get(`/feed/${userId}`)
        .set({ Authorization: `Bearer ${token}` });

      assert.equal(response.status, 200);
      assert.ok(["recommender", "fallback"].includes(response.body.source));
      assert.ok(Array.isArray(response.body.posts));
      assert.ok(response.body.posts.length >= 1);
      assert.ok(
        response.body.nextCursor === null ||
          typeof response.body.nextCursor === "number",
      );

      const post = response.body.posts.find(
        (item: { id: number }) => item.id === postId,
      );
      assert.ok(post);
      assert.equal(typeof post.userId, "number");
      assert.equal(typeof post.serviceMode, "string");
      assert.equal(post.user_id, undefined);
      assert.equal(post.service_mode, undefined);
    });
  });
}
