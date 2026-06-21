import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Change Password API", () => {
    it("skips when DATABASE_URL and JWT_SECRET are not configured", () => {
      assert.ok(true);
    });
  });
} else {
  const bcrypt = (await import("bcrypt")).default;
  const request = (await import("supertest")).default;
  const { v4: uuidv4 } = await import("uuid");
  const { signAccessToken } = await import("../../../common/utils/jwt.js");
  const { prisma } = await import("../../../lib/prisma.js");
  const { default: app } = await import("../../../server.js");

  const runId = Date.now().toString();
  const currentPassword = "TestPass@123";
  const newPassword = "NewPass@456";

  let userId = 0;
  let token = "";

  describe("Change Password API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(currentPassword, 10);

      const user = await prisma.user.create({
        data: {
          full_name: "Change Password Test User",
          username: `change_password_user_${runId}`,
          email: `change_password_user_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      userId = user.id;
      token = signAccessToken(String(userId));
    });

    after(async () => {
      await prisma.session.deleteMany({ where: { user_id: userId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("requires authentication", async () => {
      const response = await request(app)
        .post("/auth/change-password")
        .send({
          currentPassword,
          newPassword,
        });

      assert.equal(response.status, 401);
    });

    it("rejects invalid current password", async () => {
      const response = await request(app)
        .post("/auth/change-password")
        .set({ Authorization: `Bearer ${token}` })
        .send({
          currentPassword: "WrongPass@123",
          newPassword,
        });

      assert.equal(response.status, 401);
      assert.match(response.body.message, /invalid password/i);
    });

    it("rejects when new password matches current password", async () => {
      const response = await request(app)
        .post("/auth/change-password")
        .set({ Authorization: `Bearer ${token}` })
        .send({
          currentPassword,
          newPassword: currentPassword,
        });

      assert.equal(response.status, 400);
    });

    it("changes password and invalidates stored sessions", async () => {
      const refreshToken = "change-password-refresh-token";
      await prisma.session.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          refresh_token: refreshToken,
          device_info: "test-device",
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const response = await request(app)
        .post("/auth/change-password")
        .set({ Authorization: `Bearer ${token}` })
        .send({
          currentPassword,
          newPassword,
        });

      assert.equal(response.status, 200);
      assert.equal(response.body.message, "Password changed successfully");

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true },
      });
      assert.ok(updatedUser);

      const oldPasswordValid = await bcrypt.compare(
        currentPassword,
        updatedUser.password_hash,
      );
      const newPasswordValid = await bcrypt.compare(
        newPassword,
        updatedUser.password_hash,
      );
      assert.equal(oldPasswordValid, false);
      assert.equal(newPasswordValid, true);

      const sessionCount = await prisma.session.count({
        where: { user_id: userId },
      });
      assert.equal(sessionCount, 0);
    });
  });
}
