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
  const createdPostIds: number[] = [];

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

      for (let index = 0; index < 3; index += 1) {
        const post = await prisma.post.create({
          data: {
            user_id: userId,
            title: `Pagination test post ${index}`,
            description: `Pagination test description ${index}`,
            category: "OFFER",
            service_mode: "ONLINE",
            assigned_time_credits: 5,
            status: "PUBLISHED",
          },
        });
        createdPostIds.push(post.id);
      }
    });

    after(async () => {
      await prisma.post.deleteMany({ where: { id: { in: createdPostIds } } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("paginates published posts", async () => {
      const firstPage = await request(app).get("/posts?limit=2");

      assert.equal(firstPage.status, 200);
      assert.equal(firstPage.body.posts.length, 2);
      assert.ok(firstPage.body.nextCursor);

      const secondPage = await request(app).get(
        `/posts?limit=2&cursor=${firstPage.body.nextCursor}`,
      );

      assert.equal(secondPage.status, 200);
      assert.ok(secondPage.body.posts.length >= 1);
      assert.notEqual(
        secondPage.body.posts[0]?.id,
        firstPage.body.posts[0]?.id,
      );
    });

    it("paginates my posts for the authenticated user", async () => {
      const response = await request(app)
        .get("/posts/me?limit=2")
        .set({ Authorization: `Bearer ${token}` });

      assert.equal(response.status, 200);
      assert.equal(response.body.posts.length, 2);
      assert.ok(response.body.nextCursor);
      assert.equal(response.body.posts[0]?.userId, userId);
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
