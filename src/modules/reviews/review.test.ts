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
  const { v4: uuidv4 } = await import("uuid");
  const { signAccessToken, RefreshAccessToken } = await import(
    "../../common/utils/jwt.js"
  );
  const { prisma } = await import("../../lib/prisma.js");
  const { default: app } = await import("../../server.js");
  const { listPendingReviewContracts } = await import("./review.service.js");

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
  let providerEmail = "";

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
      providerEmail = provider.email;

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
          maximum_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      const response = await request(app).post("/reviews").send({
        serviceExchangeId: exchangeId,
        rating: 5,
        comment: "Great!",
      });

      assert.equal(response.status, 401);
    });

    it("creates a review from the other participant", async () => {
      const response = await request(app)
        .post("/reviews")
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
        .post("/reviews")
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
        .post("/reviews")
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
        .get(`/users/${providerId}/reviews`)
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
        .get("/users/999999/reviews")
        .set(authHeader(consumerToken));

      assert.equal(response.status, 404);
    });

    it("allows review on auto-resolved DISPUTED contract with settled escrow", async () => {
      const disputedExchange = await prisma.serviceExchange.create({
        data: {
          post_id: postId,
          provider_id: providerId,
          consumer_id: consumerId,
          time_credits: 3,
          status: "DISPUTED",
          escrow_status: "RELEASED",
          maximum_end_date: new Date(Date.now() - 60_000),
          completed_at: new Date(),
          resolution_fault_party: "SEEKER",
        },
      });

      try {
        const response = await request(app)
          .post("/reviews")
          .set(authHeader(providerToken))
          .send({
            serviceExchangeId: disputedExchange.id,
            rating: 4,
            comment: "Partial delivery review",
          });

        assert.equal(response.status, 201);
        assert.equal(response.body.review.rating, 4);
      } finally {
        await prisma.review.deleteMany({
          where: { service_exchange_id: disputedExchange.id },
        });
        await prisma.serviceExchange.delete({
          where: { id: disputedExchange.id },
        });
      }
    });

    it("rejects review on manual DISPUTED contract with frozen escrow", async () => {
      const frozenDispute = await prisma.serviceExchange.create({
        data: {
          post_id: postId,
          provider_id: providerId,
          consumer_id: consumerId,
          time_credits: 3,
          status: "DISPUTED",
          escrow_status: "HELD",
          maximum_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      try {
        const response = await request(app)
          .post("/reviews")
          .set(authHeader(providerToken))
          .send({
            serviceExchangeId: frozenDispute.id,
            rating: 4,
            comment: "Should not be allowed",
          });

        assert.equal(response.status, 400);
      } finally {
        await prisma.serviceExchange.delete({
          where: { id: frozenDispute.id },
        });
      }
    });

    describe("Pending review contracts", () => {
      const createCompletedExchange = async (
        overrides: Record<string, unknown> = {},
      ) =>
        prisma.serviceExchange.create({
          data: {
            post_id: postId,
            provider_id: providerId,
            consumer_id: consumerId,
            time_credits: 2,
            status: "COMPLETED",
            maximum_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            completed_at: new Date(),
            ...overrides,
          },
        });

      it("includes completed exchange when user has not reviewed yet", async () => {
        const exchange = await createCompletedExchange();

        try {
          const pending = await listPendingReviewContracts(providerId);
          assert.ok(
            pending.some((contract) => contract.id === exchange.id),
          );
          assert.equal(pending.find((c) => c.id === exchange.id)?.role, "provider");
          assert.equal(
            pending.find((c) => c.id === exchange.id)?.reviewee.id,
            consumerId,
          );
        } finally {
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("excludes exchange after the user has submitted a review", async () => {
        const exchange = await createCompletedExchange();

        try {
          await prisma.review.create({
            data: {
              service_exchange_id: exchange.id,
              reviewer_id: providerId,
              reviewee_id: consumerId,
              rating: 5,
              comment: "Done",
            },
          });

          const pending = await listPendingReviewContracts(providerId);
          assert.ok(!pending.some((contract) => contract.id === exchange.id));
        } finally {
          await prisma.review.deleteMany({
            where: { service_exchange_id: exchange.id },
          });
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("excludes in-progress exchanges", async () => {
        const exchange = await prisma.serviceExchange.create({
          data: {
            post_id: postId,
            provider_id: providerId,
            consumer_id: consumerId,
            time_credits: 2,
            status: "IN_PROGRESS",
            maximum_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        try {
          const pending = await listPendingReviewContracts(providerId);
          assert.ok(!pending.some((contract) => contract.id === exchange.id));
        } finally {
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("includes exchange when only the other party has reviewed", async () => {
        const exchange = await createCompletedExchange();

        try {
          await prisma.review.create({
            data: {
              service_exchange_id: exchange.id,
              reviewer_id: consumerId,
              reviewee_id: providerId,
              rating: 4,
              comment: "Thanks",
            },
          });

          const pending = await listPendingReviewContracts(providerId);
          assert.ok(pending.some((contract) => contract.id === exchange.id));
        } finally {
          await prisma.review.deleteMany({
            where: { service_exchange_id: exchange.id },
          });
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("includes settled disputed exchanges", async () => {
        const exchange = await prisma.serviceExchange.create({
          data: {
            post_id: postId,
            provider_id: providerId,
            consumer_id: consumerId,
            time_credits: 3,
            status: "DISPUTED",
            escrow_status: "RELEASED",
            maximum_end_date: new Date(Date.now() - 60_000),
            completed_at: new Date(),
            resolution_fault_party: "SEEKER",
          },
        });

        try {
          const pending = await listPendingReviewContracts(consumerId);
          assert.ok(pending.some((contract) => contract.id === exchange.id));
        } finally {
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("returns pendingReviewContracts on login", async () => {
        const exchange = await createCompletedExchange();

        try {
          const response = await request(app).post("/auth/login").send({
            email: providerEmail,
            password,
          });

          assert.equal(response.status, 200);
          assert.ok(Array.isArray(response.body.pendingReviewContracts));
          assert.ok(
            response.body.pendingReviewContracts.some(
              (contract: { id: number }) => contract.id === exchange.id,
            ),
          );
        } finally {
          await prisma.session.deleteMany({ where: { user_id: providerId } });
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });

      it("returns pendingReviewContracts on refresh", async () => {
        const exchange = await createCompletedExchange();
        const refreshToken = RefreshAccessToken(String(providerId));

        await prisma.session.create({
          data: {
            id: uuidv4(),
            user_id: providerId,
            refresh_token: refreshToken,
            device_info: "test-device",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        try {
          const response = await request(app)
            .post("/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

          assert.equal(response.status, 200);
          assert.ok(Array.isArray(response.body.pendingReviewContracts));
          assert.ok(
            response.body.pendingReviewContracts.some(
              (contract: { id: number }) => contract.id === exchange.id,
            ),
          );
        } finally {
          await prisma.session.deleteMany({
            where: { refresh_token: refreshToken },
          });
          await prisma.serviceExchange.delete({ where: { id: exchange.id } });
        }
      });
    });
  });
}
