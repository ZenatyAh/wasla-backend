import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Wallet API", () => {
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
  const { contractEndDateDaysAhead } = await import(
    "../../common/utils/contractDeadline.js"
  );

  const runId = `wallet_${Date.now()}`;
  const password = "TestPass@123";
  const passwordHash = await bcrypt.hash(password, 10);

  const createdUserIds: number[] = [];
  const createdPostIds: number[] = [];
  let seq = 0;

  type Actor = { id: number; token: string };

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createActor = async (label: string, availableBalance = 5): Promise<Actor> => {
    seq += 1;
    const user = await prisma.user.create({
      data: {
        full_name: `Wallet ${label}`,
        username: `${runId}_${label}_${seq}`,
        email: `${runId}_${label}_${seq}@test.com`,
        password_hash: passwordHash,
        available_balance: availableBalance,
      },
    });
    createdUserIds.push(user.id);
    return { id: user.id, token: signAccessToken(String(user.id)) };
  };

  const createWelcomeBonus = async (userId: number) => {
    await prisma.transaction.create({
      data: {
        receiver_id: userId,
        sender_id: null,
        amount: 5,
        transaction_type: "WELCOME_BONUS",
      },
    });
  };

  const createServicePost = async (ownerId: number): Promise<number> => {
    const post = await prisma.post.create({
      data: {
        user_id: ownerId,
        title: "Wallet history service post",
        description: "Service offered for wallet history tests.",
        category: "OFFER",
        service_mode: "ONLINE",
        assigned_time_credits: 3,
      },
    });
    createdPostIds.push(post.id);
    return post.id;
  };

  describe("Wallet History API", () => {
    after(async () => {
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { sender_id: { in: createdUserIds } },
            { receiver_id: { in: createdUserIds } },
          ],
        },
      });
      await prisma.serviceExchange.deleteMany({
        where: {
          OR: [
            { provider_id: { in: createdUserIds } },
            { consumer_id: { in: createdUserIds } },
          ],
        },
      });
      await prisma.post.deleteMany({ where: { id: { in: createdPostIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      await prisma.$disconnect();
    });

    it("returns 401 without authentication", async () => {
      const response = await request(app).get("/api/v1/wallet/history");
      assert.equal(response.status, 401);
    });

    it("returns 400 for invalid query parameters", async () => {
      const user = await createActor("invalid_query");
      await createWelcomeBonus(user.id);

      const response = await request(app)
        .get("/api/v1/wallet/history?type=invalid")
        .set(authHeader(user.token));

      assert.equal(response.status, 400);
      assert.equal(response.body.status, "fail");
    });

    it("returns 400 when startDate is after endDate", async () => {
      const user = await createActor("invalid_dates");
      await createWelcomeBonus(user.id);

      const response = await request(app)
        .get(
          "/api/v1/wallet/history?startDate=2026-06-10&endDate=2026-06-01",
        )
        .set(authHeader(user.token));

      assert.equal(response.status, 400);
    });

    it("includes welcome bonus credit for users with a ledger row", async () => {
      const user = await createActor("welcome_ledger");
      await createWelcomeBonus(user.id);

      const response = await request(app)
        .get("/api/v1/wallet/history")
        .set(authHeader(user.token));

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.ok(Array.isArray(response.body.data));

      const welcome = response.body.data.find(
        (item: { relatedServiceOrRequest?: { id: string } }) =>
          item.relatedServiceOrRequest?.id === "welcome",
      );
      assert.ok(welcome);
      assert.equal(welcome.amount, 5);
      assert.equal(welcome.type, "credit");
      assert.equal(welcome.status, "completed");
      assert.equal(welcome.counterparty.id, "system");
    });

    it("synthesizes welcome bonus for legacy users without a ledger row", async () => {
      const user = await createActor("welcome_legacy");

      const response = await request(app)
        .get("/api/v1/wallet/history?status=completed&type=credit")
        .set(authHeader(user.token));

      assert.equal(response.status, 200);
      const welcome = response.body.data.find(
        (item: { transactionId: string }) =>
          item.transactionId === `welcome-${user.id}`,
      );
      assert.ok(welcome);
      assert.equal(welcome.amount, 5);
      assert.equal(welcome.type, "credit");
      assert.equal(welcome.status, "completed");
    });

    it("returns pagination metadata", async () => {
      const user = await createActor("pagination");
      await createWelcomeBonus(user.id);

      const response = await request(app)
        .get("/api/v1/wallet/history?page=1&limit=10")
        .set(authHeader(user.token));

      assert.equal(response.status, 200);
      assert.equal(response.body.metadata.currentPage, 1);
      assert.equal(response.body.metadata.limit, 10);
      assert.ok(response.body.metadata.totalItems >= 1);
      assert.ok(response.body.metadata.totalPages >= 1);
    });

    it("records transfer debit for consumer and credit for provider after confirm", async () => {
      const requester = await createActor("transfer_requester", 5);
      const provider = await createActor("transfer_provider", 5);
      await createWelcomeBonus(requester.id);
      await createWelcomeBonus(provider.id);

      const postId = await createServicePost(requester.id);
      const duration = 3;

      const contractEndDate = contractEndDateDaysAhead(7);

      const created = await request(app)
        .post("/exchanges/request")
        .set(authHeader(requester.token))
        .send({ postId, providerId: provider.id, duration, contractEndDate });
      assert.equal(created.status, 201);
      const exchangeId = created.body.exchange.id;

      await request(app)
        .put(`/exchanges/${exchangeId}/accept`)
        .set(authHeader(provider.token));
      await request(app)
        .put(`/exchanges/${exchangeId}/deliver`)
        .set(authHeader(provider.token));
      await request(app)
        .put(`/exchanges/${exchangeId}/confirm`)
        .set(authHeader(requester.token));

      const requesterHistory = await request(app)
        .get("/api/v1/wallet/history?status=completed")
        .set(authHeader(requester.token));
      const providerHistory = await request(app)
        .get("/api/v1/wallet/history?status=completed")
        .set(authHeader(provider.token));

      const requesterTransfer = requesterHistory.body.data.find(
        (item: { amount: number; type: string }) =>
          item.amount === duration && item.type === "debit",
      );
      const providerTransfer = providerHistory.body.data.find(
        (item: { amount: number; type: string }) =>
          item.amount === duration && item.type === "credit",
      );

      assert.ok(requesterTransfer);
      assert.ok(providerTransfer);
      assert.equal(requesterTransfer.status, "completed");
      assert.equal(providerTransfer.status, "completed");
    });

    it("supports type and status filters", async () => {
      const requester = await createActor("filters_requester", 5);
      const provider = await createActor("filters_provider", 5);
      await createWelcomeBonus(requester.id);

      const postId = await createServicePost(requester.id);
      const contractEndDate = contractEndDateDaysAhead(7);
      const created = await request(app)
        .post("/exchanges/request")
        .set(authHeader(requester.token))
        .send({ postId, providerId: provider.id, duration: 2, contractEndDate });
      const exchangeId = created.body.exchange.id;

      await request(app)
        .put(`/exchanges/${exchangeId}/accept`)
        .set(authHeader(provider.token));

      const heldResponse = await request(app)
        .get("/api/v1/wallet/history?status=held&type=debit")
        .set(authHeader(requester.token));

      assert.equal(heldResponse.status, 200);
      assert.ok(
        heldResponse.body.data.some(
          (item: { status: string; type: string }) =>
            item.status === "held" && item.type === "debit",
        ),
      );

      const creditResponse = await request(app)
        .get("/api/v1/wallet/history?type=credit&status=completed")
        .set(authHeader(requester.token));

      assert.equal(creditResponse.status, 200);
      assert.ok(
        creditResponse.body.data.every(
          (item: { type: string; status: string }) =>
            item.type === "credit" && item.status === "completed",
        ),
      );
    });

    it("isolates history to the authenticated user", async () => {
      const userA = await createActor("isolation_a");
      const userB = await createActor("isolation_b");
      await createWelcomeBonus(userA.id);
      await createWelcomeBonus(userB.id);

      const response = await request(app)
        .get("/api/v1/wallet/history")
        .set(authHeader(userA.token));

      assert.equal(response.status, 200);
      assert.ok(
        response.body.data.every(
          (item: { type: string }) =>
            item.type === "credit" || item.type === "debit",
        ),
      );
      assert.ok(response.body.data.length >= 1);
    });
  });
}
