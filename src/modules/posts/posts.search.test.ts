import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

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
  let originalFetch = globalThis.fetch;

  describe("Posts search API", () => {
    before(async () => {
      originalFetch = globalThis.fetch;
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Search Test User",
          username: `search_user_${runId}`,
          email: `search_user_${runId}@test.com`,
          password_hash: passwordHash,
          location: "SearchCity",
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
      globalThis.fetch = originalFetch;
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

    describe("Database Fallback Search path", () => {
      beforeEach(() => {
        // Mock fetch to throw error to trigger fallback path
        globalThis.fetch = async (url, init) => {
          if (typeof url === "string" && url.includes("/search")) {
            throw new TypeError("Failed to fetch");
          }
          return originalFetch(url, init);
        };
      });

      it("filters posts by category", async () => {
        // Find matching category
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { category: "OFFER" } });
        
        assert.equal(responseMatch.status, 200);
        assert.equal(responseMatch.body.source, "fallback");
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        // Mismatching category
        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { category: "REQUEST" } });

        assert.equal(responseMismatch.status, 200);
        const postIdsMismatch = responseMismatch.body.results.map((r: any) => r.post.id);
        assert.ok(!postIdsMismatch.includes(postId));
      });

      it("filters posts by serviceMode", async () => {
        // Find matching serviceMode
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { serviceMode: "ONLINE" } });

        assert.equal(responseMatch.status, 200);
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        // Mismatching serviceMode
        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { serviceMode: "OFFLINE" } });

        assert.equal(responseMismatch.status, 200);
        const postIdsMismatch = responseMismatch.body.results.map((r: any) => r.post.id);
        assert.ok(!postIdsMismatch.includes(postId));
      });

      it("filters posts by time credits range", async () => {
        // Within range
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { minCredits: 2, maxCredits: 8 } });

        assert.equal(responseMatch.status, 200);
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        // Outside range (too low)
        const responseLow = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { maxCredits: 3 } });

        assert.equal(responseLow.status, 200);
        const postIdsLow = responseLow.body.results.map((r: any) => r.post.id);
        assert.ok(!postIdsLow.includes(postId));

        // Outside range (too high)
        const responseHigh = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { minCredits: 10 } });

        assert.equal(responseHigh.status, 200);
        const postIdsHigh = responseHigh.body.results.map((r: any) => r.post.id);
        assert.ok(!postIdsHigh.includes(postId));
      });

      it("filters posts by user location", async () => {
        // Matching location
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { location: "SearchCity" } });

        assert.equal(responseMatch.status, 200);
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        // Mismatching location
        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { location: "OtherCity" } });

        assert.equal(responseMismatch.status, 200);
        const postIdsMismatch = responseMismatch.body.results.map((r: any) => r.post.id);
        assert.ok(!postIdsMismatch.includes(postId));
      });

      it("returns all filtered matches even when topK is smaller", async () => {
        const secondPost = await prisma.post.create({
          data: {
            user_id: userId,
            title: `${searchTerm} خدمة كهرباء`,
            description: "وصف اختبار إضافي للفلترة",
            category: "OFFER",
            service_mode: "ONLINE",
            assigned_time_credits: 3,
            status: "PUBLISHED",
          },
        });

        try {
          const response = await request(app)
            .post("/posts/search")
            .set({ Authorization: `Bearer ${token}` })
            .send({
              query: searchTerm,
              topK: 1,
              filters: { category: "OFFER" },
            });

          assert.equal(response.status, 200);
          assert.ok(response.body.results.length >= 2);
        } finally {
          await prisma.post.delete({ where: { id: secondPost.id } });
        }
      });
    });

    describe("Recommender Semantic Search path", () => {
      beforeEach(() => {
        // Mock fetch to return a successful recommender response containing our test postId
        globalThis.fetch = async (url, init) => {
          if (typeof url === "string" && url.includes("/search")) {
            return {
              ok: true,
              json: async () => ({
                query: searchTerm,
                count: 1,
                results: [
                  {
                    post_id: String(postId),
                    title: `${searchTerm} خدمة سباكة`,
                    category: "OFFER",
                    post_type: "عرض",
                    similarity_score: 0.95,
                    freshness: 0.9,
                    trust: 0.9,
                    final_score: 0.92
                  }
                ]
              })
            } as Response;
          }
          return originalFetch(url, init);
        };
      });

      it("filters posts by category", async () => {
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { category: "OFFER" } });
        
        assert.equal(responseMatch.status, 200);
        assert.equal(responseMatch.body.source, "recommender");
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { category: "REQUEST" } });

        assert.equal(responseMismatch.status, 200);
        assert.equal(responseMismatch.body.source, "recommender");
        assert.equal(responseMismatch.body.results.length, 0);
      });

      it("filters posts by serviceMode", async () => {
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { serviceMode: "ONLINE" } });

        assert.equal(responseMatch.status, 200);
        assert.equal(responseMatch.body.source, "recommender");
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { serviceMode: "OFFLINE" } });

        assert.equal(responseMismatch.status, 200);
        assert.equal(responseMismatch.body.results.length, 0);
      });

      it("filters posts by time credits range", async () => {
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { minCredits: 2, maxCredits: 8 } });

        assert.equal(responseMatch.status, 200);
        assert.equal(responseMatch.body.source, "recommender");
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { minCredits: 10 } });

        assert.equal(responseMismatch.status, 200);
        assert.equal(responseMismatch.body.results.length, 0);
      });

      it("filters posts by user location", async () => {
        const responseMatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { location: "SearchCity" } });

        assert.equal(responseMatch.status, 200);
        assert.equal(responseMatch.body.source, "recommender");
        const postIdsMatch = responseMatch.body.results.map((r: any) => r.post.id);
        assert.ok(postIdsMatch.includes(postId));

        const responseMismatch = await request(app)
          .post("/posts/search")
          .set({ Authorization: `Bearer ${token}` })
          .send({ query: searchTerm, filters: { location: "OtherCity" } });

        assert.equal(responseMismatch.status, 200);
        assert.equal(responseMismatch.body.results.length, 0);
      });
    });
  });
}
