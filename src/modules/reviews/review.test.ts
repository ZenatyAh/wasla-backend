import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Reviews API", () => {
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
  let outsiderId = 0;
  let postId = 0;
  let exchangeId = 0;
  let existingReviewId = 0;

  let providerToken = "";
  let consumerToken = "";
  let outsiderToken = "";

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  describe("Reviews API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const provider = await prisma.user.create({
        data: {
          full_name: "Review Provider",
          username: `review_provider_${runId}`,
          email: `review_provider_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const consumer = await prisma.user.create({
        data: {
          full_name: "Review Consumer",
          username: `review_consumer_${runId}`,
          email: `review_consumer_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const outsider = await prisma.user.create({
        data: {
          full_name: "Review Outsider",
          username: `review_outsider_${runId}`,
          email: `review_outsider_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      providerId = provider.id;
      consumerId = consumer.id;
      outsiderId = outsider.id;

      providerToken = signAccessToken(String(providerId));
      consumerToken = signAccessToken(String(consumerId));
      outsiderToken = signAccessToken(String(outsiderId));

      const post = await prisma.post.create({
        data: {
          user_id: providerId,
          title: "Review test service post",
          description: "Review test post description for exchange",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 2,
        },
      });

      postId = post.id;

      const exchange = await prisma.serviceExchange.create({
        data: {
          post_id: postId,
          provider_id: providerId,
          consumer_id: consumerId,
          time_credits: 2,
          status: "COMPLETED",
          completed_at: new Date(),
        },
      });

      exchangeId = exchange.id;

      const existingReview = await prisma.review.create({
        data: {
          service_exchange_id: exchangeId,
          reviewer_id: consumerId,
          reviewee_id: providerId,
          rating: 4,
          comment: "Good work",
        },
      });

      existingReviewId = existingReview.id;
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
        where: { id: { in: [providerId, consumerId, outsiderId] } },
      });
      await prisma.$disconnect();
    });

    it("returns 401 without auth token", async () => {
      const response = await request(app).post("/api/reviews").send({
        serviceExchangeId: exchangeId,
        rating: 5,
        comment: "Great!",
      });

      assert.equal(response.status, 401);
    });

    it("creates a review from the other participant", async () => {
      const response = await request(app)
        .post("/api/reviews")
        .set(authHeader(providerToken))
        .send({
          serviceExchangeId: exchangeId,
          rating: 5,
          comment: "Great consumer to work with",
        });

      assert.equal(response.status, 201);
      assert.equal(response.body.review.rating, 5);
      assert.equal(response.body.review.reviewer.id, providerId);
    });

    it("rejects duplicate review from same reviewer", async () => {
      const response = await request(app)
        .post("/api/reviews")
        .set(authHeader(consumerToken))
        .send({
          serviceExchangeId: exchangeId,
          rating: 3,
          comment: "Duplicate attempt",
        });

      assert.equal(response.status, 409);
    });

    it("rejects review from non-participant", async () => {
      const response = await request(app)
        .post("/api/reviews")
        .set(authHeader(outsiderToken))
        .send({
          serviceExchangeId: exchangeId,
          rating: 5,
          comment: "Not allowed",
        });

      assert.equal(response.status, 403);
    });

    it("lists reviews for a user with pagination", async () => {
      const response = await request(app)
        .get(`/api/users/${providerId}/reviews`)
        .set(authHeader(consumerToken));

      assert.equal(response.status, 200);
      assert.ok(response.body.reviews.length >= 1);
      assert.ok(
        response.body.reviews.some(
          (review: { id: number }) => review.id === existingReviewId,
        ),
      );
    });

    it("returns 404 when listing reviews for non-existent user", async () => {
      const response = await request(app)
        .get("/api/users/999999/reviews")
        .set(authHeader(consumerToken));

      assert.equal(response.status, 404);
    });
  });
}
