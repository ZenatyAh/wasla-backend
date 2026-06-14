import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Message idempotency", () => {
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

  const runId = `${Date.now()}_idempotency`;
  const password = "TestPass@123";

  let ownerId = 0;
  let visitorId = 0;
  let postId = 0;
  let conversationId = "";
  let visitorToken = "";

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  describe("Message idempotency", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const owner = await prisma.user.create({
        data: {
          full_name: "Idempotency Owner",
          username: `idempotency_owner_${runId}`,
          email: `idempotency_owner_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const visitor = await prisma.user.create({
        data: {
          full_name: "Idempotency Visitor",
          username: `idempotency_visitor_${runId}`,
          email: `idempotency_visitor_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      ownerId = owner.id;
      visitorId = visitor.id;
      visitorToken = signAccessToken(String(visitorId));

      const post = await prisma.post.create({
        data: {
          user_id: ownerId,
          title: "Idempotency test post title",
          description: "Idempotency test post description",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 10,
        },
      });

      postId = post.id;

      const conversationResponse = await request(app)
        .post("/conversations")
        .set(authHeader(visitorToken))
        .send({ postId });

      conversationId = conversationResponse.body.conversation.id;
    });

    after(async () => {
      await prisma.message.deleteMany({
        where: { conversation: { postId } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { userId: { in: [ownerId, visitorId] } },
      });
      await prisma.conversation.deleteMany({
        where: { postId },
      });
      await prisma.post.deleteMany({
        where: { id: postId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, visitorId] } },
      });

      await prisma.$disconnect();
    });

    it("returns 200 without duplicating when clientMessageId is reused", async () => {
      const clientMessageId = randomUUID();

      const first = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة idempotent", clientMessageId });

      assert.equal(first.status, 201);
      assert.equal(first.body.message.clientMessageId, clientMessageId);

      const second = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة idempotent", clientMessageId });

      assert.equal(second.status, 200);
      assert.equal(second.body.message.id, first.body.message.id);

      const count = await prisma.message.count({
        where: { clientMessageId },
      });

      assert.equal(count, 1);
    });
  });
}
