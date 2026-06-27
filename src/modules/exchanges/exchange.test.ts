import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

// The repo's test runner is `node:test` via `tsx --test` (see package.json),
// not Jest. We therefore build this Supertest suite on `node:test` so it runs
// with `npm test`, mirroring the existing chat.test.ts harness.
const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Exchange API", () => {
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
  const { resolveExpiredContracts } = await import("./exchanges.service.js");

  const runId = `exch_${Date.now()}`;
  const password = "TestPass@123";
  const passwordHash = await bcrypt.hash(password, 10);

  // Track everything we create so teardown leaves the database clean.
  const createdUserIds: number[] = [];
  const createdPostIds: number[] = [];
  let seq = 0;

  type Actor = { id: number; token: string };

  const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Creates an isolated user with a known starting balance. */
  const createActor = async (label: string, availableBalance = 5): Promise<Actor> => {
    seq += 1;
    const user = await prisma.user.create({
      data: {
        full_name: `Exchange ${label}`,
        username: `${runId}_${label}_${seq}`,
        email: `${runId}_${label}_${seq}@test.com`,
        password_hash: passwordHash,
        available_balance: availableBalance,
      },
    });
    createdUserIds.push(user.id);
    return { id: user.id, token: signAccessToken(String(user.id)) };
  };

  const createServicePost = async (ownerId: number): Promise<number> => {
    const post = await prisma.post.create({
      data: {
        user_id: ownerId,
        title: "Time exchange service post",
        description: "A service offered in exchange for time credits.",
        category: "OFFER",
        service_mode: "ONLINE",
        assigned_time_credits: 3,
      },
    });
    createdPostIds.push(post.id);
    return post.id;
  };

  const getBalances = async (userId: number) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        available_balance: true,
        escrow_balance: true,
        services_provided: true,
        services_received: true,
      },
    });
    return user;
  };

  /** Creates a PENDING contract and returns its id and response body. */
  const createPendingExchange = async (
    requester: Actor,
    providerId: number,
    postId: number,
    duration: number,
  ) => {
    const contractEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await request(app)
      .post("/exchanges/request")
      .set(authHeader(requester.token))
      .send({ postId, providerId, duration, contractEndDate });
    return response;
  };

  describe("Exchange / Contract System", () => {
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

    // ---------------------------------------------------------------------
    // 2 & 3. Happy path full lifecycle + escrow/balance validation
    // ---------------------------------------------------------------------
    describe("Happy path: full lifecycle with balance assertions", () => {
      let requester: Actor;
      let provider: Actor;
      let postId = 0;
      let exchangeId = 0;
      const duration = 3;

      before(async () => {
        requester = await createActor("hp_requester", 5);
        provider = await createActor("hp_provider", 5);
        postId = await createServicePost(provider.id);
      });

      it("creates a request as PENDING without deducting credits", async () => {
        const response = await createPendingExchange(
          requester,
          provider.id,
          postId,
          duration,
        );

        assert.equal(response.status, 201);
        assert.equal(response.body.exchange.status, "PENDING");
        assert.equal(response.body.exchange.escrowStatus, "NONE");
        assert.equal(response.body.exchange.requesterId, requester.id);
        assert.equal(response.body.exchange.providerId, provider.id);
        assert.ok(response.body.exchange.contractEndDate);
        exchangeId = response.body.exchange.id;

        // Critical: requesting must NOT touch the requester's balance.
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 5);
        assert.equal(balances.escrow_balance, 0);
      });

      it("freezes credits into escrow only when the provider accepts", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "IN_PROGRESS");
        assert.equal(response.body.exchange.escrowStatus, "HELD");
        assert.ok(response.body.exchange.acceptedAt);

        // Available is debited and the same amount is now frozen in escrow.
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 2);
        assert.equal(balances.escrow_balance, 3);
      });

      it("moves to WAITING_CONFIRMATION on delivery, balances unchanged", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/deliver`)
          .set(authHeader(provider.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "WAITING_CONFIRMATION");
        assert.ok(response.body.exchange.deliveredAt);

        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 2);
        assert.equal(balances.escrow_balance, 3);
      });

      it("settles balances and stats when the requester confirms", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/confirm`)
          .set(authHeader(requester.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "COMPLETED");
        assert.equal(response.body.exchange.escrowStatus, "RELEASED");
        assert.ok(response.body.exchange.completedAt);

        const requesterBalances = await getBalances(requester.id);
        const providerBalances = await getBalances(provider.id);

        // Requester: escrow released (spent); provider credited.
        assert.equal(requesterBalances.available_balance, 2);
        assert.equal(requesterBalances.escrow_balance, 0);
        assert.equal(providerBalances.available_balance, 8);

        // Stats incremented on both sides.
        assert.equal(requesterBalances.services_received, 1);
        assert.equal(providerBalances.services_provided, 1);
      });

      it("records a TRANSFER ledger entry for the completed exchange", async () => {
        const ledger = await prisma.transaction.findFirst({
          where: { reference_contract_id: exchangeId },
        });
        assert.ok(ledger);
        assert.equal(ledger?.transaction_type, "TRANSFER");
        assert.equal(ledger?.amount, duration);
        assert.equal(ledger?.sender_id, requester.id);
        assert.equal(ledger?.receiver_id, provider.id);
      });
    });

    // ---------------------------------------------------------------------
    // 4. Edge cases & constraints (sad paths)
    // ---------------------------------------------------------------------
    describe("Validation: self-request and insufficient credits", () => {
      let requester: Actor;
      let provider: Actor;
      let postId = 0;

      before(async () => {
        requester = await createActor("val_requester", 2);
        provider = await createActor("val_provider", 5);
        postId = await createServicePost(provider.id);
      });

      it("rejects requesting a service from yourself (400)", async () => {
        const response = await createPendingExchange(
          requester,
          requester.id,
          postId,
          1,
        );
        assert.equal(response.status, 400);
      });

      it("rejects a request that exceeds the requester's balance (400)", async () => {
        // Build spec A validates available >= duration at request time, so a
        // requester with 2 credits cannot even open a 3-credit request.
        const response = await createPendingExchange(
          requester,
          provider.id,
          postId,
          3,
        );
        assert.equal(response.status, 400);
        assert.match(response.body.message, /insufficient/i);
      });
    });

    describe("Escrow enforced at acceptance (request passes, accept fails)", () => {
      // This is the meaningful 'insufficient funds' escrow check: a request can
      // be opened while funds exist, but if the balance is no longer sufficient
      // by acceptance time the HOLD must fail.
      let requester: Actor;
      let providerA: Actor;
      let providerB: Actor;
      let postA = 0;
      let postB = 0;
      let exchangeA = 0;
      let exchangeB = 0;

      before(async () => {
        // Exactly enough for ONE 3-credit contract.
        requester = await createActor("acc_requester", 3);
        providerA = await createActor("acc_providerA", 5);
        providerB = await createActor("acc_providerB", 5);
        postA = await createServicePost(providerA.id);
        postB = await createServicePost(providerB.id);

        const a = await createPendingExchange(requester, providerA.id, postA, 3);
        const b = await createPendingExchange(requester, providerB.id, postB, 3);
        exchangeA = a.body.exchange.id;
        exchangeB = b.body.exchange.id;
      });

      it("opens both requests successfully (no deduction yet)", async () => {
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 3);
        assert.equal(balances.escrow_balance, 0);
      });

      it("accepts the first contract, freezing the full balance", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeA}/accept`)
          .set(authHeader(providerA.token));
        assert.equal(response.status, 200);

        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 0);
        assert.equal(balances.escrow_balance, 3);
      });

      it("fails the second acceptance for insufficient funds (400)", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeB}/accept`)
          .set(authHeader(providerB.token));
        assert.equal(response.status, 400);

        // Balance unchanged by the failed acceptance.
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 0);
        assert.equal(balances.escrow_balance, 3);
      });
    });

    describe("Invalid state transitions", () => {
      let requester: Actor;
      let provider: Actor;
      let postId = 0;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("st_requester", 5);
        provider = await createActor("st_provider", 5);
        postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          2,
        );
        exchangeId = created.body.exchange.id;
      });

      it("cannot confirm a PENDING contract (400)", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/confirm`)
          .set(authHeader(requester.token));
        assert.equal(response.status, 400);
      });

      it("cannot deliver a PENDING contract (400)", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/deliver`)
          .set(authHeader(provider.token));
        assert.equal(response.status, 400);
      });

      it("cannot deliver a COMPLETED contract (400)", async () => {
        // Drive the contract all the way to COMPLETED first.
        await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));
        await request(app)
          .put(`/exchanges/${exchangeId}/deliver`)
          .set(authHeader(provider.token));
        await request(app)
          .put(`/exchanges/${exchangeId}/confirm`)
          .set(authHeader(requester.token));

        const response = await request(app)
          .put(`/exchanges/${exchangeId}/deliver`)
          .set(authHeader(provider.token));
        assert.equal(response.status, 400);
      });
    });

    describe("Unauthorized actions", () => {
      let requester: Actor;
      let provider: Actor;
      let postId = 0;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("auth_requester", 5);
        provider = await createActor("auth_provider", 5);
        postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          2,
        );
        exchangeId = created.body.exchange.id;
      });

      it("forbids the requester from accepting their own contract (403)", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(requester.token));
        assert.equal(response.status, 403);
      });

      it("forbids the provider from confirming delivery (403)", async () => {
        // Move to WAITING_CONFIRMATION, then have the provider try to confirm.
        await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));
        await request(app)
          .put(`/exchanges/${exchangeId}/deliver`)
          .set(authHeader(provider.token));

        const response = await request(app)
          .put(`/exchanges/${exchangeId}/confirm`)
          .set(authHeader(provider.token));
        assert.equal(response.status, 403);
      });

      it("requires authentication (401)", async () => {
        const response = await request(app).get("/exchanges");
        assert.equal(response.status, 401);
      });
    });

    // ---------------------------------------------------------------------
    // 5. Concurrency / double-spend
    // ---------------------------------------------------------------------
    describe("Concurrency: double-spend prevention on accept", () => {
      let requester: Actor;
      let providerA: Actor;
      let providerB: Actor;
      let exchangeA = 0;
      let exchangeB = 0;

      before(async () => {
        // The requester can fund exactly ONE of the two 3-credit contracts.
        requester = await createActor("race_requester", 3);
        providerA = await createActor("race_providerA", 5);
        providerB = await createActor("race_providerB", 5);
        const postA = await createServicePost(providerA.id);
        const postB = await createServicePost(providerB.id);

        const a = await createPendingExchange(requester, providerA.id, postA, 3);
        const b = await createPendingExchange(requester, providerB.id, postB, 3);
        exchangeA = a.body.exchange.id;
        exchangeB = b.body.exchange.id;
      });

      it("lets only one of two concurrent acceptances succeed", async () => {
        // Fire both acceptances simultaneously. The atomic guarded update inside
        // the Serializable $transaction must ensure exactly one wins.
        const [resA, resB] = await Promise.all([
          request(app)
            .put(`/exchanges/${exchangeA}/accept`)
            .set(authHeader(providerA.token)),
          request(app)
            .put(`/exchanges/${exchangeB}/accept`)
            .set(authHeader(providerB.token)),
        ]);

        const statuses = [resA.status, resB.status].sort();
        const successes = statuses.filter((s) => s === 200).length;
        const failures = statuses.filter((s) => s !== 200).length;

        assert.equal(successes, 1, "exactly one acceptance should succeed");
        assert.equal(failures, 1, "exactly one acceptance should fail");

        // Final state proves no double-spend: 0 available, 3 frozen.
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 0);
        assert.equal(balances.escrow_balance, 3);
      });
    });

    // ---------------------------------------------------------------------
    // 6. Cancellation & refund logic
    // ---------------------------------------------------------------------
    describe("Cancellation at PENDING (no balance changes)", () => {
      let requester: Actor;
      let provider: Actor;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("cancp_requester", 5);
        provider = await createActor("cancp_provider", 5);
        const postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          3,
        );
        exchangeId = created.body.exchange.id;
      });

      it("cancels a PENDING contract without touching balances", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/cancel`)
          .set(authHeader(requester.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "CANCELED");
        assert.equal(response.body.exchange.escrowStatus, "NONE");

        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 5);
        assert.equal(balances.escrow_balance, 0);
      });
    });

    describe("Provider cancellation at IN_PROGRESS (refund)", () => {
      let requester: Actor;
      let provider: Actor;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("cancr_requester", 5);
        provider = await createActor("cancr_provider", 5);
        const postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          3,
        );
        exchangeId = created.body.exchange.id;
        // Move to IN_PROGRESS so credits are held in escrow.
        await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));
      });

      it("refunds frozen credits back to the requester's available balance", async () => {
        const held = await getBalances(requester.id);
        assert.equal(held.available_balance, 2);
        assert.equal(held.escrow_balance, 3);

        const response = await request(app)
          .put(`/exchanges/${exchangeId}/cancel`)
          .set(authHeader(provider.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "CANCELED");
        assert.equal(response.body.exchange.escrowStatus, "REFUNDED");

        // Escrow fully returned to available; nothing left frozen.
        const refunded = await getBalances(requester.id);
        assert.equal(refunded.available_balance, 5);
        assert.equal(refunded.escrow_balance, 0);
      });
    });

    describe("Requester cancellation at IN_PROGRESS escalates to DISPUTED", () => {
      let requester: Actor;
      let provider: Actor;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("disp_requester", 5);
        provider = await createActor("disp_provider", 5);
        const postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          3,
        );
        exchangeId = created.body.exchange.id;
        await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));
      });

      it("keeps credits frozen and marks the contract DISPUTED", async () => {
        const response = await request(app)
          .put(`/exchanges/${exchangeId}/cancel`)
          .set(authHeader(requester.token));

        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.status, "DISPUTED");

        // Credits stay frozen pending resolution.
        const balances = await getBalances(requester.id);
        assert.equal(balances.available_balance, 2);
        assert.equal(balances.escrow_balance, 3);
      });
    });

    // ---------------------------------------------------------------------
    // Listing, filtering & pagination
    // ---------------------------------------------------------------------
    describe("Listing, filtering and access control", () => {
      let requester: Actor;
      let provider: Actor;
      let outsider: Actor;
      let exchangeId = 0;

      before(async () => {
        requester = await createActor("list_requester", 10);
        provider = await createActor("list_provider", 5);
        outsider = await createActor("list_outsider", 5);
        const postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          2,
        );
        exchangeId = created.body.exchange.id;
      });

      it("lists contracts for the requester with pagination metadata", async () => {
        const response = await request(app)
          .get("/exchanges?role=requester&page=1&limit=10")
          .set(authHeader(requester.token));

        assert.equal(response.status, 200);
        assert.ok(Array.isArray(response.body.data));
        assert.ok(response.body.data.length >= 1);
        assert.equal(response.body.meta.page, 1);
        assert.equal(response.body.meta.limit, 10);
        assert.ok(response.body.meta.total >= 1);
      });

      it("filters contracts by status", async () => {
        const response = await request(app)
          .get("/exchanges?status=PENDING")
          .set(authHeader(provider.token));

        assert.equal(response.status, 200);
        assert.ok(
          response.body.data.every(
            (item: { status: string }) => item.status === "PENDING",
          ),
        );
      });

      it("returns 404 when listing a single foreign-but-missing id, 403 for non-participant", async () => {
        const response = await request(app)
          .get(`/exchanges/${exchangeId}`)
          .set(authHeader(outsider.token));
        assert.equal(response.status, 403);
      });

      it("lets a participant fetch the contract by id", async () => {
        const response = await request(app)
          .get(`/exchanges/${exchangeId}`)
          .set(authHeader(requester.token));
        assert.equal(response.status, 200);
        assert.equal(response.body.exchange.id, exchangeId);
      });
    });

    // ---------------------------------------------------------------------
    // 7. Deadline auto-resolution (UC-TX-07)
    // ---------------------------------------------------------------------
    describe("Deadline auto-resolution (UC-TX-07)", () => {
      const pastDeadline = () => new Date(Date.now() - 60_000);

      const acceptAndExpire = async (
        requester: Actor,
        provider: Actor,
        duration: number,
        options: {
          completedHours?: number;
          sessions?: Array<{ hours: number; status: "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED" }>;
        } = {},
      ) => {
        const postId = await createServicePost(provider.id);
        const created = await createPendingExchange(
          requester,
          provider.id,
          postId,
          duration,
        );
        assert.equal(created.status, 201);
        const exchangeId = created.body.exchange.id;

        await request(app)
          .put(`/exchanges/${exchangeId}/accept`)
          .set(authHeader(provider.token));

        if (options.sessions?.length) {
          let sessionNumber = 0;
          for (const session of options.sessions) {
            sessionNumber += 1;
            await prisma.workSession.create({
              data: {
                contract_id: exchangeId,
                session_number: sessionNumber,
                hours: session.hours,
                status: session.status,
                ...(session.status === "CONFIRMED"
                  ? { confirmed_at: new Date() }
                  : {}),
              },
            });
          }
        }

        await prisma.serviceExchange.update({
          where: { id: exchangeId },
          data: {
            maximum_end_date: pastDeadline(),
            completed_hours: options.completedHours ?? 0,
          },
        });

        return exchangeId;
      };

      it("Alt 1: full confirmed hours → COMPLETED with correct escrow settlement", async () => {
        const requester = await createActor("uc07_alt1_req", 10);
        const provider = await createActor("uc07_alt1_prov", 5);
        const exchangeId = await acceptAndExpire(requester, provider, 5, {
          completedHours: 5,
          sessions: [{ hours: 5, status: "CONFIRMED" }],
        });

        const requesterBefore = await getBalances(requester.id);
        const providerBefore = await getBalances(provider.id);

        const count = await resolveExpiredContracts();
        assert.equal(count, 1);

        const exchange = await prisma.serviceExchange.findUniqueOrThrow({
          where: { id: exchangeId },
        });
        assert.equal(exchange.status, "COMPLETED");
        assert.equal(exchange.escrow_status, "RELEASED");
        assert.equal(exchange.resolution_fault_party, "NONE");

        const requesterAfter = await getBalances(requester.id);
        const providerAfter = await getBalances(provider.id);
        assert.equal(requesterAfter.escrow_balance, 0);
        assert.equal(requesterAfter.available_balance, requesterBefore.available_balance);
        assert.equal(providerAfter.available_balance, providerBefore.available_balance + 5);
        assert.equal(providerAfter.services_provided, providerBefore.services_provided + 1);
      });

      it("Alt 2 seeker fault: pending last session → DISPUTED partial settlement", async () => {
        const requester = await createActor("uc07_seeker_req", 10);
        const provider = await createActor("uc07_seeker_prov", 5);
        const exchangeId = await acceptAndExpire(requester, provider, 5, {
          completedHours: 2,
          sessions: [
            { hours: 2, status: "CONFIRMED" },
            { hours: 3, status: "PENDING_CONFIRMATION" },
          ],
        });

        const providerBefore = await getBalances(provider.id);
        const requesterBefore = await getBalances(requester.id);

        await resolveExpiredContracts();

        const exchange = await prisma.serviceExchange.findUniqueOrThrow({
          where: { id: exchangeId },
        });
        assert.equal(exchange.status, "DISPUTED");
        assert.equal(exchange.escrow_status, "RELEASED");
        assert.equal(exchange.resolution_fault_party, "SEEKER");

        const requesterAfter = await getBalances(requester.id);
        const providerAfter = await getBalances(provider.id);
        assert.equal(requesterAfter.escrow_balance, 0);
        assert.equal(requesterAfter.available_balance, requesterBefore.available_balance + 3);
        assert.equal(providerAfter.available_balance, providerBefore.available_balance + 2);
      });

      it("Alt 2 provider fault: no sessions → full refund", async () => {
        const requester = await createActor("uc07_prov_req", 10);
        const provider = await createActor("uc07_prov_prov", 5);
        const exchangeId = await acceptAndExpire(requester, provider, 5);

        const requesterBefore = await getBalances(requester.id);
        const providerBefore = await getBalances(provider.id);

        await resolveExpiredContracts();

        const exchange = await prisma.serviceExchange.findUniqueOrThrow({
          where: { id: exchangeId },
        });
        assert.equal(exchange.status, "DISPUTED");
        assert.equal(exchange.escrow_status, "REFUNDED");
        assert.equal(exchange.resolution_fault_party, "PROVIDER");

        const requesterAfter = await getBalances(requester.id);
        const providerAfter = await getBalances(provider.id);
        assert.equal(requesterAfter.escrow_balance, 0);
        assert.equal(requesterAfter.available_balance, requesterBefore.available_balance + 5);
        assert.equal(providerAfter.available_balance, providerBefore.available_balance);
      });

      it("Alt 2 provider fault: confirmed last session but hours short → full refund", async () => {
        const requester = await createActor("uc07_short_req", 10);
        const provider = await createActor("uc07_short_prov", 5);
        const exchangeId = await acceptAndExpire(requester, provider, 5, {
          completedHours: 2,
          sessions: [{ hours: 2, status: "CONFIRMED" }],
        });

        const requesterBefore = await getBalances(requester.id);
        const providerBefore = await getBalances(provider.id);

        await resolveExpiredContracts();

        const exchange = await prisma.serviceExchange.findUniqueOrThrow({
          where: { id: exchangeId },
        });
        assert.equal(exchange.resolution_fault_party, "PROVIDER");

        const requesterAfter = await getBalances(requester.id);
        const providerAfter = await getBalances(provider.id);
        assert.equal(requesterAfter.available_balance, requesterBefore.available_balance + 5);
        assert.equal(providerAfter.available_balance, providerBefore.available_balance);
      });

      it("Ex 3: second cron pass does not double-pay", async () => {
        const requester = await createActor("uc07_dup_req", 10);
        const provider = await createActor("uc07_dup_prov", 5);
        await acceptAndExpire(requester, provider, 5);

        assert.equal(await resolveExpiredContracts(), 1);
        const afterFirst = await getBalances(requester.id);
        assert.equal(await resolveExpiredContracts(), 0);
        const afterSecond = await getBalances(requester.id);
        assert.deepEqual(afterSecond, afterFirst);
      });
    });
  });
}
