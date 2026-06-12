import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Profile API", () => {
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

  let providerId = 0;
  let consumerId = 0;
  let postId = 0;
  let exchangeId = 0;

  let providerToken = "";
  let consumerToken = "";

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  describe("Profile API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const provider = await prisma.user.create({
        data: {
          full_name: "Profile Provider",
          username: `profile_provider_${runId}`,
          email: `profile_provider_${runId}@test.com`,
          password_hash: passwordHash,
          bio: "Provider bio text",
          available_balance: 10,
        },
      });

      const consumer = await prisma.user.create({
        data: {
          full_name: "Profile Consumer",
          username: `profile_consumer_${runId}`,
          email: `profile_consumer_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      providerId = provider.id;
      consumerId = consumer.id;

      providerToken = signAccessToken(String(providerId));
      consumerToken = signAccessToken(String(consumerId));

      const post = await prisma.post.create({
        data: {
          user_id: providerId,
          title: "Profile test service post",
          description: "Profile test post description for exchange",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 3,
        },
      });

      postId = post.id;

      const exchange = await prisma.serviceExchange.create({
        data: {
          post_id: postId,
          provider_id: providerId,
          consumer_id: consumerId,
          time_credits: 3,
          status: "COMPLETED",
          completed_at: new Date(),
        },
      });

      exchangeId = exchange.id;

      await prisma.review.create({
        data: {
          service_exchange_id: exchangeId,
          reviewer_id: consumerId,
          reviewee_id: providerId,
          rating: 5,
          comment: "Excellent service!",
        },
      });
    });

    after(async () => {
      await prisma.review.deleteMany({
        where: { service_exchange_id: exchangeId },
      });
      await prisma.serviceExchange.deleteMany({
        where: { id: exchangeId },
      });
      await prisma.post.deleteMany({
        where: { id: postId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [providerId, consumerId] } },
      });
      await prisma.$disconnect();
    });

    it("returns 401 without auth token", async () => {
      const response = await request(app).get(`/users/${providerId}/profile`);

      assert.equal(response.status, 401);
    });

    it("returns profile with stats and trust rating", async () => {
      const response = await request(app)
        .get(`/users/${providerId}/profile`)
        .set(authHeader(consumerToken));

      assert.equal(response.status, 200);
      assert.equal(response.body.profile.name, "Profile Provider");
      assert.equal(response.body.profile.username, `profile_provider_${runId}`);
      assert.equal(response.body.profile.stats.availableTimeCredits, 10);
      assert.equal(response.body.profile.stats.servicesProvided, 1);
      assert.equal(response.body.profile.stats.servicesReceived, 0);
      assert.equal(response.body.profile.trustRating.average, 5);
      assert.equal(response.body.profile.trustRating.count, 1);
      assert.equal(response.body.profile.recentExchanges.length, 1);
      assert.equal(response.body.profile.recentExchanges[0].role, "PROVIDER");
      assert.equal(
        response.body.profile.recentExchanges[0].counterparty.id,
        consumerId,
      );
    });

    it("returns 404 for non-existent user", async () => {
      const response = await request(app)
        .get("/users/999999/profile")
        .set(authHeader(consumerToken));

      assert.equal(response.status, 404);
    });

    it("updates current user profile", async () => {
      const response = await request(app)
        .put("/users/profile")
        .set(authHeader(providerToken))
        .send({
          bio: "Updated provider bio",
          profilePicture: "https://example.com/avatar.png",
        });

      assert.equal(response.status, 200);
      assert.equal(response.body.profile.bio, "Updated provider bio");
      assert.equal(
        response.body.profile.profilePicture,
        "https://example.com/avatar.png",
      );
    });
  });
}
