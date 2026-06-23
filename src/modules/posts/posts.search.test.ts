import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Posts search API", () => {
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
  const searchTerm = `بحث_فريد_${runId}`;

  let userId = 0;
  let postId = 0;
  let token = "";

  describe("Posts search API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Search Test User",
          username: `search_user_${runId}`,
          email: `search_user_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));

      const post = await prisma.post.create({
        data: {
          user_id: userId,
          title: `${searchTerm} خدمة سباكة`,
          description: "وصف اختبار البحث عن المنشورات",
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

    it("returns 401 when unauthenticated", async () => {
      const response = await request(app)
        .post("/posts/search")
        .send({ query: searchTerm });

      assert.equal(response.status, 401);
    });

    it("returns 400 for empty query", async () => {
      const response = await request(app)
        .post("/posts/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: "" });

      assert.equal(response.status, 400);
    });

    it("returns camelCase search response shape", async () => {
      const response = await request(app)
        .post("/posts/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, topK: 10 });

      assert.equal(response.status, 200);
      assert.equal(typeof response.body.query, "string");
      assert.equal(typeof response.body.count, "number");
      assert.ok(["recommender", "fallback"].includes(response.body.source));
      assert.ok(Array.isArray(response.body.results));

      if (response.body.source === "fallback") {
        const match = response.body.results.find(
          (item: { post: { id: number } }) => item.post.id === postId,
        );
        assert.ok(match);
        assert.equal(match.scores, null);
      }

      const first = response.body.results[0];
      if (first) {
        assert.equal(typeof first.post.id, "number");
        assert.equal(typeof first.post.userId, "number");
        assert.equal(first.post.user_id, undefined);
        if (response.body.source === "recommender" && first.scores) {
          assert.equal(typeof first.scores.similarityScore, "number");
          assert.equal(typeof first.scores.finalScore, "number");
        }
      }
    });
  });
}
