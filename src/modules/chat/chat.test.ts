import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Chat API", () => {
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

  let ownerId = 0;
  let visitorId = 0;
  let outsiderId = 0;
  let postId = 0;
  let conversationId = "";
  let messageId = "";

  let ownerToken = "";
  let visitorToken = "";
  let outsiderToken = "";

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  describe("Chat API", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const owner = await prisma.user.create({
        data: {
          full_name: "Chat Owner",
          username: `chat_owner_${runId}`,
          email: `chat_owner_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const visitor = await prisma.user.create({
        data: {
          full_name: "Chat Visitor",
          username: `chat_visitor_${runId}`,
          email: `chat_visitor_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const outsider = await prisma.user.create({
        data: {
          full_name: "Chat Outsider",
          username: `chat_outsider_${runId}`,
          email: `chat_outsider_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      ownerId = owner.id;
      visitorId = visitor.id;
      outsiderId = outsider.id;

      ownerToken = signAccessToken(String(ownerId));
      visitorToken = signAccessToken(String(visitorId));
      outsiderToken = signAccessToken(String(outsiderId));

      const post = await prisma.post.create({
        data: {
          user_id: ownerId,
          title: "Chat test post title",
          description: "Chat test post description for messaging flow",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 10,
        },
      });

      postId = post.id;
    });

    after(async () => {
      await prisma.notification.deleteMany({
        where: {
          userId: { in: [ownerId, visitorId, outsiderId] },
        },
      });
      await prisma.messageReadReceipt.deleteMany({
        where: {
          user: { id: { in: [ownerId, visitorId, outsiderId] } },
        },
      });
      await prisma.message.deleteMany({
        where: {
          conversation: { postId },
        },
      });
      await prisma.conversationParticipant.deleteMany({
        where: {
          userId: { in: [ownerId, visitorId, outsiderId] },
        },
      });
      await prisma.conversation.deleteMany({
        where: { postId },
      });
      await prisma.post.deleteMany({
        where: { id: postId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, visitorId, outsiderId] } },
      });

      await prisma.$disconnect();
    });

    it("creates a conversation as visitor", async () => {
      const response = await request(app)
        .post("/conversations")
        .set(authHeader(visitorToken))
        .send({ postId });

      assert.equal(response.status, 201);
      assert.ok(response.body.conversation?.id);
      conversationId = response.body.conversation.id;
    });

    it("reuses an existing conversation", async () => {
      const response = await request(app)
        .post("/conversations")
        .set(authHeader(visitorToken))
        .send({ postId });

      assert.equal(response.status, 200);
      assert.equal(response.body.conversation.id, conversationId);
    });

    it("lists conversations for participant", async () => {
      const response = await request(app)
        .get("/conversations")
        .set(authHeader(visitorToken));

      assert.equal(response.status, 200);
      assert.ok(Array.isArray(response.body.conversations));
      assert.ok(response.body.conversations.length >= 1);
    });

    it("blocks outsider from conversation details", async () => {
      const response = await request(app)
        .get(`/conversations/${conversationId}`)
        .set(authHeader(outsiderToken));

      assert.equal(response.status, 403);
    });

    it("sends a message", async () => {
      const response = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "مرحباً، هل الخدمة متاحة؟" });

      assert.equal(response.status, 201);
      assert.equal(response.body.message.body, "مرحباً، هل الخدمة متاحة؟");
      messageId = response.body.message.id;
    });

    it("rejects empty message body", async () => {
      const response = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "   " });

      assert.equal(response.status, 400);
    });

    it("lists messages in chronological order", async () => {
      const response = await request(app)
        .get(`/conversations/${conversationId}/messages`)
        .set(authHeader(ownerToken));

      assert.equal(response.status, 200);
      assert.ok(response.body.messages.length >= 1);
      assert.equal(response.body.messages[0].id, messageId);
    });

    it("shows unread count for recipient", async () => {
      const response = await request(app)
        .get(`/conversations/${conversationId}`)
        .set(authHeader(ownerToken));

      assert.equal(response.status, 200);
      assert.ok(response.body.conversation.unreadCount >= 1);
    });

    it("marks message as read by recipient", async () => {
      const response = await request(app)
        .post(`/messages/${messageId}/read`)
        .set(authHeader(ownerToken));

      assert.equal(response.status, 200);
      assert.equal(response.body.readReceipt.userId, ownerId);
    });

    it("lets owner reply to visitor", async () => {
      const response = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(ownerToken))
        .send({ body: "أهلاً، نعم الخدمة متاحة يوم الخميس." });

      assert.equal(response.status, 201);
      assert.equal(response.body.message.senderId, ownerId);
      assert.equal(
        response.body.message.body,
        "أهلاً، نعم الخدمة متاحة يوم الخميس.",
      );
    });

    it("lets visitor see owner reply in message history", async () => {
      const response = await request(app)
        .get(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken));

      assert.equal(response.status, 200);

      const ownerReply = response.body.messages.find(
        (message: { senderId: number; body: string | null }) =>
          message.senderId === ownerId &&
          message.body === "أهلاً، نعم الخدمة متاحة يوم الخميس.",
      );

      assert.ok(ownerReply);
    });

    it("supports back-and-forth messaging between both participants", async () => {
      const visitorFollowUp = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "ممتاز، الساعة 4 مناسبة؟" });

      assert.equal(visitorFollowUp.status, 201);
      assert.equal(visitorFollowUp.body.message.senderId, visitorId);

      const ownerFollowUp = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(ownerToken))
        .send({ body: "نعم، الساعة 4 مناسبة جداً." });

      assert.equal(ownerFollowUp.status, 201);
      assert.equal(ownerFollowUp.body.message.senderId, ownerId);

      const ownerView = await request(app)
        .get(`/conversations/${conversationId}/messages`)
        .set(authHeader(ownerToken));

      assert.equal(ownerView.status, 200);

      const bodies = ownerView.body.messages.map(
        (message: { body: string | null }) => message.body,
      );

      assert.ok(bodies.includes("ممتاز، الساعة 4 مناسبة؟"));
      assert.ok(bodies.includes("نعم، الساعة 4 مناسبة جداً."));

      const ownerUnread = await request(app)
        .get(`/conversations/${conversationId}`)
        .set(authHeader(ownerToken));

      assert.equal(ownerUnread.status, 200);
      assert.ok(ownerUnread.body.conversation.unreadCount >= 1);

      const visitorUnread = await request(app)
        .get(`/conversations/${conversationId}`)
        .set(authHeader(visitorToken));

      assert.equal(visitorUnread.status, 200);
      assert.ok(visitorUnread.body.conversation.unreadCount >= 1);
    });

    it("prevents sender from marking own message as read", async () => {
      const response = await request(app)
        .post(`/messages/${messageId}/read`)
        .set(authHeader(visitorToken));

      assert.equal(response.status, 403);
    });

    it("edits own message", async () => {
      const response = await request(app)
        .patch(`/messages/${messageId}`)
        .set(authHeader(visitorToken))
        .send({ body: "مرحباً، هل يمكننا التنسيق يوم الخميس؟" });

      assert.equal(response.status, 200);
      assert.ok(response.body.message.editedAt);
    });

    it("blocks editing another users message", async () => {
      const response = await request(app)
        .patch(`/messages/${messageId}`)
        .set(authHeader(ownerToken))
        .send({ body: "محاولة تعديل غير مسموحة" });

      assert.equal(response.status, 403);
    });

    it("soft deletes own message", async () => {
      const response = await request(app)
        .delete(`/messages/${messageId}`)
        .set(authHeader(visitorToken));

      assert.equal(response.status, 200);
      assert.equal(response.body.message.body, null);
      assert.ok(response.body.message.deletedAt);
    });

    it("creates in-app notification for recipient", async () => {
      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة جديدة للإشعار" });

      assert.equal(sendResponse.status, 201);

      const notifications = await request(app)
        .get("/notifications")
        .set(authHeader(ownerToken));

      assert.equal(notifications.status, 200);
      assert.ok(notifications.body.notifications.length >= 1);
    });
  });
}
