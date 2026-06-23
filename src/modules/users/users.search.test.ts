import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Users search API", () => {
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
  const searchTerm = `مستخدم_بحث_${runId}`;

  let userId = 0;
  let token = "";

  describe("Users search API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: `${searchTerm} أحمد`,
          username: `search_user_${runId}`,
          email: `search_user_${runId}@test.com`,
          password_hash: passwordHash,
          bio: "مطور ويب متخصص في React",
          location: "القاهرة",
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));
    });

    after(async () => {
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("returns 401 when unauthenticated", async () => {
      const response = await request(app)
        .post("/users/search")
        .send({ query: searchTerm });

      assert.equal(response.status, 401);
    });

    it("returns 400 for empty query", async () => {
      const response = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: "" });

      assert.equal(response.status, 400);
    });

    it("returns matching users from database search", async () => {
      const response = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, topK: 10 });

      assert.equal(response.status, 200);
      assert.equal(response.body.query, searchTerm);
      assert.equal(response.body.source, "database");
      assert.ok(Array.isArray(response.body.results));

      const match = response.body.results.find(
        (item: { user: { id: number } }) => item.user.id === userId,
      );
      assert.ok(match);
      assert.equal(match.user.username, `search_user_${runId}`);
      assert.equal(match.user.location, "القاهرة");
      assert.equal(match.user.email, undefined);
    });
  });
}
