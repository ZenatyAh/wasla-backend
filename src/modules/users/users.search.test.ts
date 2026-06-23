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
    let skillId = 0;

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

      const skill = await prisma.skill.create({
        data: {
          name: `SearchSkill_${runId}`,
        },
      });
      skillId = skill.id;

      await prisma.userSkill.create({
        data: {
          user_id: userId,
          skill_id: skillId,
          skill_type: "OFFER",
        },
      });
    });

    after(async () => {
      await prisma.userSkill.deleteMany({ where: { user_id: userId } });
      await prisma.skill.deleteMany({ where: { id: skillId } });
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

    it("filters users by isOnline status", async () => {
      // isOnline: false (matches, default is false)
      const responseMatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { isOnline: false } });

      assert.equal(responseMatch.status, 200);
      const userIdsMatch = responseMatch.body.results.map((r: any) => r.user.id);
      assert.ok(userIdsMatch.includes(userId));

      // isOnline: true (should not match)
      const responseMismatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { isOnline: true } });

      assert.equal(responseMismatch.status, 200);
      const userIdsMismatch = responseMismatch.body.results.map((r: any) => r.user.id);
      assert.ok(!userIdsMismatch.includes(userId));
    });

    it("filters users by isVerified status", async () => {
      // isVerified: false (matches, default is false)
      const responseMatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { isVerified: false } });

      assert.equal(responseMatch.status, 200);
      const userIdsMatch = responseMatch.body.results.map((r: any) => r.user.id);
      assert.ok(userIdsMatch.includes(userId));

      // isVerified: true (should not match)
      const responseMismatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { isVerified: true } });

      assert.equal(responseMismatch.status, 200);
      const userIdsMismatch = responseMismatch.body.results.map((r: any) => r.user.id);
      assert.ok(!userIdsMismatch.includes(userId));
    });

    it("filters users by location", async () => {
      // Matching location
      const responseMatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { location: "القاهرة" } });

      assert.equal(responseMatch.status, 200);
      const userIdsMatch = responseMatch.body.results.map((r: any) => r.user.id);
      assert.ok(userIdsMatch.includes(userId));

      // Mismatching location
      const responseMismatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { location: "الإسكندرية" } });

      assert.equal(responseMismatch.status, 200);
      const userIdsMismatch = responseMismatch.body.results.map((r: any) => r.user.id);
      assert.ok(!userIdsMismatch.includes(userId));
    });

    it("filters users by skillType", async () => {
      // Matching skillType (OFFER)
      const responseMatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { skillType: "OFFER" } });

      assert.equal(responseMatch.status, 200);
      const userIdsMatch = responseMatch.body.results.map((r: any) => r.user.id);
      assert.ok(userIdsMatch.includes(userId));

      // Mismatching skillType (REQUEST)
      const responseMismatch = await request(app)
        .post("/users/search")
        .set({ Authorization: `Bearer ${token}` })
        .send({ query: searchTerm, filters: { skillType: "REQUEST" } });

      assert.equal(responseMismatch.status, 200);
      const userIdsMismatch = responseMismatch.body.results.map((r: any) => r.user.id);
      assert.ok(!userIdsMismatch.includes(userId));
    });
  });
}
