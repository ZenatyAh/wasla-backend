import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Delete Account API", () => {
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
  let counterpartyId = 0;
  let postId = 0;
  let pendingExchangeId = 0;

  let userToken = "";
  let userEmail = "";
  let userUsername = "";

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  describe("Delete Account API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);
      userEmail = `delete_user_${runId}@test.com`;
      userUsername = `delete_user_${runId}`;

      const user = await prisma.user.create({
        data: {
          full_name: "Delete Test User",
          username: userUsername,
          email: userEmail,
          password_hash: passwordHash,
          available_balance: 5,
        },
      });

      userId = user.id;
      userToken = signAccessToken(String(userId));

      const counterparty = await prisma.user.create({
        data: {
          full_name: "Delete Counterparty",
          username: `delete_counterparty_${runId}`,
          email: `delete_counterparty_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      counterpartyId = counterparty.id;

      const post = await prisma.post.create({
        data: {
          user_id: counterpartyId,
          title: "Delete account exchange post",
          description: "Post used to test active exchange guard on delete",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 3,
        },
      });

      postId = post.id;

      const pendingExchange = await prisma.serviceExchange.create({
        data: {
          post_id: postId,
          provider_id: counterpartyId,
          consumer_id: userId,
          time_credits: 3,
          status: "PENDING",
        },
      });

      pendingExchangeId = pendingExchange.id;
    });

    after(async () => {
      await prisma.serviceExchange.deleteMany({
        where: { id: pendingExchangeId },
      });
      await prisma.post.deleteMany({
        where: { id: postId },
      });
      await prisma.session.deleteMany({
        where: { user_id: { in: [userId, counterpartyId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userId, counterpartyId] } },
      });
      await prisma.$disconnect();
    });

    it("returns 401 without auth token", async () => {
      const response = await request(app)
        .delete("/users/account")
        .send({ password });

      assert.equal(response.status, 401);
    });

    it("returns 400 when password is missing", async () => {
      const response = await request(app)
        .delete("/users/account")
        .set(authHeader(userToken))
        .send({});

      assert.equal(response.status, 400);
    });

    it("returns 409 when user has active service exchanges", async () => {
      const response = await request(app)
        .delete("/users/account")
        .set(authHeader(userToken))
        .send({ password });

      assert.equal(response.status, 409);
      assert.match(
        response.body.message,
        /active service exchanges/i,
      );
    });

    it("returns 401 for wrong password after active exchange is cleared", async () => {
      await prisma.serviceExchange.deleteMany({
        where: { id: pendingExchangeId },
      });
      pendingExchangeId = 0;

      const response = await request(app)
        .delete("/users/account")
        .set(authHeader(userToken))
        .send({ password: "WrongPass@123" });

      assert.equal(response.status, 401);
      assert.equal(response.body.message, "Invalid password");
    });

    it("deletes account with correct password and blocks further access", async () => {
      const response = await request(app)
        .delete("/users/account")
        .set(authHeader(userToken))
        .send({ password });

      assert.equal(response.status, 204);

      const loginResponse = await request(app)
        .post("/auth/login")
        .send({ email: userEmail, password });

      assert.equal(loginResponse.status, 400);
      assert.match(loginResponse.body.message, /Invalid credentials/i);

      const profileResponse = await request(app)
        .get(`/users/${userId}/profile`)
        .set(authHeader(userToken));

      assert.equal(profileResponse.status, 401);

      const deletedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          deleted_at: true,
          email: true,
          username: true,
          full_name: true,
          available_balance: true,
        },
      });

      assert.ok(deletedUser?.deleted_at);
      assert.notEqual(deletedUser?.email, userEmail);
      assert.notEqual(deletedUser?.username, userUsername);
      assert.equal(deletedUser?.full_name, "Deleted User");
      assert.equal(deletedUser?.available_balance, 0);

      const reviewsResponse = await request(app)
        .get(`/users/${userId}/reviews`)
        .set(authHeader(signAccessToken(String(counterpartyId))));

      assert.equal(reviewsResponse.status, 404);
    });

    it("returns 400 when service is called on already deleted account", async () => {
      const { deleteAccountService } = await import("./deleteAccount.service.js");

      await assert.rejects(
        () => deleteAccountService(userId, password),
        (err: Error) => err.message === "Account already deleted",
      );
    });
  });
}
