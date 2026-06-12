import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Skills API", () => {
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
  let technicalSkillId = 0;
  let generalSkillId = 0;

  describe("Skills API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Skills Test User",
          username: `skills_user_${runId}`,
          email: `skills_user_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));

      const technicalSkill = await prisma.skill.create({
        data: {
          name: `Test Technical Skill ${runId}`,
          category: "TECHNICAL",
        },
      });
      technicalSkillId = technicalSkill.id;

      const generalSkill = await prisma.skill.create({
        data: {
          name: `Test General Skill ${runId}`,
          category: "GENERAL",
        },
      });
      generalSkillId = generalSkill.id;
    });

    after(async () => {
      await prisma.skill.deleteMany({
        where: { id: { in: [technicalSkillId, generalSkillId] } },
      });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("GET /skills returns approved skills", async () => {
      const response = await request(app).get("/skills");

      assert.equal(response.status, 200);
      assert.ok(Array.isArray(response.body.skills));
      assert.ok(
        response.body.skills.some(
          (skill: { id: number }) => skill.id === technicalSkillId,
        ),
      );
      assert.ok(
        response.body.skills.some(
          (skill: { id: number }) => skill.id === generalSkillId,
        ),
      );
    });

    it("GET /skills?category=TECHNICAL filters by category", async () => {
      const response = await request(app).get("/skills?category=TECHNICAL");

      assert.equal(response.status, 200);
      assert.ok(
        response.body.skills.every(
          (skill: { category: string }) => skill.category === "TECHNICAL",
        ),
      );
      assert.ok(
        response.body.skills.some(
          (skill: { id: number }) => skill.id === technicalSkillId,
        ),
      );
      assert.ok(
        !response.body.skills.some(
          (skill: { id: number }) => skill.id === generalSkillId,
        ),
      );
    });

    it("POST /skills without token returns 401", async () => {
      const response = await request(app)
        .post("/skills")
        .send({ name: "Unauthorized Skill", category: "GENERAL" });

      assert.equal(response.status, 401);
    });

    it("POST /skills with token creates a skill", async () => {
      const skillName = `Created Skill ${runId}`;

      const response = await request(app)
        .post("/skills")
        .set({ Authorization: `Bearer ${token}` })
        .send({ name: skillName, category: "TECHNICAL" });

      assert.equal(response.status, 201);
      assert.equal(response.body.skill.name, skillName);
      assert.equal(response.body.skill.category, "TECHNICAL");
      assert.equal(response.body.skill.isApproved, true);

      await prisma.skill.delete({ where: { id: response.body.skill.id } });
    });

    it("POST /skills returns 409 for duplicate skill", async () => {
      const duplicateName = `Duplicate Skill ${runId}`;

      const first = await request(app)
        .post("/skills")
        .set({ Authorization: `Bearer ${token}` })
        .send({ name: duplicateName, category: "GENERAL" });

      assert.equal(first.status, 201);

      const second = await request(app)
        .post("/skills")
        .set({ Authorization: `Bearer ${token}` })
        .send({ name: duplicateName, category: "GENERAL" });

      assert.equal(second.status, 409);
      assert.equal(second.body.message, "Skill already exists");

      await prisma.skill.delete({ where: { id: first.body.skill.id } });
    });
  });
}
