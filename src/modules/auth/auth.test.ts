import "dotenv/config";

if (!process.env.CLERK_WEBHOOK_SECRET?.startsWith("whsec_")) {
  process.env.CLERK_WEBHOOK_SECRET = `whsec_${Buffer.from(
    "wasla_auth_webhook_test_secret",
  ).toString("base64")}`;
}

if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = "sk_test_wasla_clerk_secret";
}

if (!process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_wasla_clerk_publishable";
}

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcrypt";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Auth API", () => {
    it("skips when DATABASE_URL and JWT_SECRET are not configured", () => {
      assert.ok(true);
    });
  });
} else {
  const request = (await import("supertest")).default;
  const { prisma } = await import("../../lib/prisma.js");
  const { default: app } = await import("../../server.js");
  const { generateToken } = await import("../../common/utils/generateToken.js");
  const { signAccessToken } = await import("../../common/utils/jwt.js");

  const runId = Date.now().toString();
  const password = "TestPass@123";
  const newPassword = "NewPass@456";

  let userId = 0;
  let clerkUserId = 0;
  let accessToken = "";
  let sessionAgent: Awaited<ReturnType<typeof request.agent>> | null = null;

  const registerPayload = {
    full_name: "Auth Test User",
    username: `auth_user_${runId}`,
    email: `auth_${runId}@test.com`,
    password,
    bio: "Bio long enough for validation rules in auth register schema for testing purposes here.",
    offeredSkills: ["JavaScript"],
    requiredSkills: ["Design"],
  };

  describe("Auth API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const clerkLinkedUser = await prisma.user.create({
        data: {
          full_name: "Clerk Linked Auth User",
          username: `auth_clerk_${runId}`,
          email: `auth_clerk_${runId}@test.com`,
          password_hash: passwordHash,
          clerk_user_id: `user_auth_clerk_${runId}`,
        },
      });

      clerkUserId = clerkLinkedUser.id;
    });

    after(async () => {
      await prisma.passwordResetToken.deleteMany({
        where: {
          user: {
            email: {
              in: [registerPayload.email, `auth_clerk_${runId}@test.com`],
            },
          },
        },
      });
      await prisma.session.deleteMany({
        where: {
          user: {
            email: {
              in: [registerPayload.email, `auth_clerk_${runId}@test.com`],
            },
          },
        },
      });
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { receiver: { username: { startsWith: `auth_` } } },
            { sender: { username: { startsWith: `auth_` } } },
          ],
        },
      });
      await prisma.userSkill.deleteMany({
        where: {
          user: { username: { startsWith: `auth_` } },
        },
      });
      await prisma.user.deleteMany({
        where: { username: { startsWith: `auth_` } },
      });
      await prisma.$disconnect();
    });

    it("registers a new user and sets refresh cookie", async () => {
      const agent = request.agent(app);
      const response = await agent.post("/auth/register").send(registerPayload);

      assert.equal(response.status, 200);
      assert.ok(response.body.accessToken);
      assert.equal(response.body.user.email, registerPayload.email);
      assert.ok(response.headers["set-cookie"]?.some((cookie: string) =>
        cookie.startsWith("refreshToken="),
      ));

      userId = response.body.user.id;
      accessToken = response.body.accessToken;
      sessionAgent = agent;
    });

    it("rejects duplicate registration", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send(registerPayload);

      assert.equal(response.status, 400);
    });

    it("logs in with valid credentials", async () => {
      const agent = request.agent(app);
      const response = await agent.post("/auth/login").send({
        email: registerPayload.email,
        password,
      });

      assert.equal(response.status, 200);
      assert.ok(response.body.accessToken);
      assert.equal(response.body.user.id, userId);
      accessToken = response.body.accessToken;
      sessionAgent = agent;
    });

    it("rejects invalid login credentials", async () => {
      const response = await request(app).post("/auth/login").send({
        email: registerPayload.email,
        password: "WrongPass@999",
      });

      assert.equal(response.status, 400);
      assert.match(response.body.message, /Invalid credentials/i);
    });

    it("blocks legacy login for Clerk-linked users", async () => {
      const response = await request(app).post("/auth/login").send({
        email: `auth_clerk_${runId}@test.com`,
        password,
      });

      assert.equal(response.status, 400);
      assert.match(response.body.message, /Please sign in with Clerk/i);
    });

    it("protects /me with access token", async () => {
      const response = await request(app)
        .get("/me")
        .set("Authorization", `Bearer ${accessToken}`);

      assert.equal(response.status, 200);
      assert.equal(response.body.user.userId, String(userId));
    });

    it("rejects /me without token", async () => {
      const response = await request(app).get("/me");

      assert.equal(response.status, 401);
    });

    it("refreshes access token using refresh cookie", async () => {
      assert.ok(sessionAgent, "expected session from register/login");

      const refreshResponse = await sessionAgent!.post("/auth/refresh");

      assert.equal(refreshResponse.status, 200);
      assert.ok(refreshResponse.body.accessToken);
      accessToken = refreshResponse.body.accessToken;
    });

    it("rejects refresh without cookie", async () => {
      const response = await request(app).post("/auth/refresh");

      assert.equal(response.status, 403);
    });

    it("logs out and clears refresh cookie", async () => {
      const agent = request.agent(app);
      const loginResponse = await agent.post("/auth/login").send({
        email: registerPayload.email,
        password,
      });

      assert.equal(loginResponse.status, 200);

      const logoutResponse = await agent.post("/auth/logout");

      assert.equal(logoutResponse.status, 204);

      const refreshResponse = await agent.post("/auth/refresh");
      assert.equal(refreshResponse.status, 403);
    });

    it("returns the same message for forget-password regardless of email existence", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const existing = await request(app)
        .post("/auth/forget-password")
        .send({ email: registerPayload.email });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const missing = await request(app)
        .post("/auth/forget-password")
        .send({ email: `missing_${runId}@test.com` });

      assert.equal(existing.status, 200);
      assert.equal(missing.status, 200);
      assert.equal(
        existing.body.message,
        "If the email exists, we sent a reset link",
      );
      assert.equal(existing.body.message, missing.body.message);
    });

    it("resets password with a valid token and invalidates sessions", async () => {
      assert.ok(sessionAgent, "expected session from register/login");

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const { token, tokenHash, expiresAt } = generateToken();
      await prisma.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const resetResponse = await request(app)
        .post("/auth/reset-password")
        .send({ token, newPassword });

      assert.equal(resetResponse.status, 200);
      assert.equal(resetResponse.body.message, "Password reset successfully");

      const refreshAfterReset = await sessionAgent!.post("/auth/refresh");
      assert.equal(refreshAfterReset.status, 403);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const loginWithNewPassword = await request(app).post("/auth/login").send({
        email: registerPayload.email,
        password: newPassword,
      });

      assert.equal(loginWithNewPassword.status, 200);
    });

    it("rejects legacy reset for Clerk-linked users", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const { token, tokenHash, expiresAt } = generateToken();

      await prisma.passwordResetToken.create({
        data: {
          userId: clerkUserId,
          tokenHash,
          expiresAt,
        },
      });

      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token, newPassword });

      assert.equal(response.status, 400);
      assert.match(response.body.message, /Clerk/i);
    });

    it("returns privacy-safe Clerk forgot-password response", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const linked = await request(app)
        .post("/auth/clerk/forgot-password")
        .send({ email: `auth_clerk_${runId}@test.com` });

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const missing = await request(app)
        .post("/auth/clerk/forgot-password")
        .send({ email: `missing_clerk_${runId}@test.com` });

      assert.equal(linked.status, 200);
      assert.equal(missing.status, 200);
      assert.equal(
        linked.body.message,
        "If the email exists, we sent a reset link",
      );
    });

    it("rejects invalid access token on protected route", async () => {
      const response = await request(app)
        .get("/me")
        .set("Authorization", "Bearer invalid.token.value");

      assert.equal(response.status, 401);
    });
  });
}
