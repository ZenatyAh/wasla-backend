import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { io as ioClient, type Socket } from "socket.io-client";
import {
  startSocketTestServer,
  waitForSocketEvent,
} from "./chat.test.helpers.js";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Chat Socket.IO", () => {
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
  const { initSocket } = await import("../../realtime/socket.js");
  const { STATUS_BATCH_DEBOUNCE_MS } = await import(
    "../../realtime/message-status.batch.js"
  );

  const runId = `${Date.now()}_socket`;
  const password = "TestPass@123";

  let ownerId = 0;
  let visitorId = 0;
  let postId = 0;
  let conversationId = "";

  let ownerToken = "";
  let visitorToken = "";
  let baseUrl = "";

  let ownerSocket: Socket | null = null;
  let visitorSocket: Socket | null = null;
  let closeServer: (() => Promise<void>) | null = null;

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const connectClient = (token: string) =>
    ioClient(baseUrl, {
      transports: ["websocket"],
      auth: { token },
    });

  describe("Chat Socket.IO", () => {
    before(async () => {
      const testServer = await startSocketTestServer(app, initSocket);
      baseUrl = testServer.baseUrl;
      closeServer = testServer.close;

      const passwordHash = await bcrypt.hash(password, 10);

      const owner = await prisma.user.create({
        data: {
          full_name: "Socket Owner",
          username: `socket_owner_${runId}`,
          email: `socket_owner_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const visitor = await prisma.user.create({
        data: {
          full_name: "Socket Visitor",
          username: `socket_visitor_${runId}`,
          email: `socket_visitor_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      ownerId = owner.id;
      visitorId = visitor.id;

      ownerToken = signAccessToken(String(ownerId));
      visitorToken = signAccessToken(String(visitorId));

      const post = await prisma.post.create({
        data: {
          user_id: ownerId,
          title: "Socket chat test post title",
          description: "Socket chat test post description for realtime flow",
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

      ownerSocket = connectClient(ownerToken);
      visitorSocket = connectClient(visitorToken);

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          ownerSocket?.once("connect", () => resolve());
          ownerSocket?.once("connect_error", reject);
        }),
        new Promise<void>((resolve, reject) => {
          visitorSocket?.once("connect", () => resolve());
          visitorSocket?.once("connect_error", reject);
        }),
      ]);

      ownerSocket.emit("chat:join", { conversationId });
      visitorSocket.emit("chat:join", { conversationId });

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    after(async () => {
      ownerSocket?.disconnect();
      visitorSocket?.disconnect();

      if (closeServer) {
        await closeServer();
      }

      await prisma.notification.deleteMany({
        where: { userId: { in: [ownerId, visitorId] } },
      });
      await prisma.messageReadReceipt.deleteMany({
        where: { user: { id: { in: [ownerId, visitorId] } } },
      });
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

    it("delivers visitor message to connected owner in real time", async () => {
      const eventPromise = waitForSocketEvent<{
        body: string;
        senderId: number;
      }>(ownerSocket!, "chat:message:new");

      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة فورية من الزائر", clientMessageId: randomUUID() });

      assert.equal(sendResponse.status, 201);

      const payload = await eventPromise;

      assert.equal(payload.body, "رسالة فورية من الزائر");
      assert.equal(payload.senderId, visitorId);
    });

    it("delivers owner reply to connected visitor in real time", async () => {
      const eventPromise = waitForSocketEvent<{
        body: string;
        senderId: number;
      }>(visitorSocket!, "chat:message:new");

      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(ownerToken))
        .send({ body: "رد فوري من صاحب المنشور", clientMessageId: randomUUID() });

      assert.equal(sendResponse.status, 201);

      const payload = await eventPromise;

      assert.equal(payload.body, "رد فوري من صاحب المنشور");
      assert.equal(payload.senderId, ownerId);
    });

    it("delivers read receipt events to the other participant", async () => {
      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة للتحقق من read receipt", clientMessageId: randomUUID() });

      assert.equal(sendResponse.status, 201);

      const messageId = sendResponse.body.message.id;
      const readPromise = waitForSocketEvent<{ userId: number; messageId: string }>(
        ownerSocket!,
        "chat:message:read",
      );

      const readResponse = await request(app)
        .post(`/messages/${messageId}/read`)
        .set(authHeader(ownerToken));

      assert.equal(readResponse.status, 200);

      const payload = await readPromise;

      assert.equal(payload.userId, ownerId);
      assert.equal(payload.messageId, messageId);
    });

    it("batch-delivers message status updates via socket", async () => {
      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({
          body: "رسالة للتحقق من delivered status",
          clientMessageId: randomUUID(),
        });

      assert.equal(sendResponse.status, 201);

      const messageId = sendResponse.body.message.id;
      const statusPromise = waitForSocketEvent<{
        conversationId: string;
        updates: Array<{ messageId: string; status: string }>;
      }>(visitorSocket!, "chat:messages:status");

      ownerSocket!.emit("chat:messages:delivered", {
        conversationId,
        messageIds: [messageId],
      });

      const payload = await statusPromise;

      assert.equal(payload.conversationId, conversationId);
      assert.ok(
        payload.updates.some(
          (update) =>
            update.messageId === messageId && update.status === "DELIVERED",
        ),
      );

      await new Promise((resolve) =>
        setTimeout(resolve, STATUS_BATCH_DEBOUNCE_MS + 100),
      );
    });

    it("batch-read updates message status via socket", async () => {
      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({
          body: "رسالة للتحقق من read status",
          clientMessageId: randomUUID(),
        });

      assert.equal(sendResponse.status, 201);

      const messageId = sendResponse.body.message.id;
      const statusPromise = waitForSocketEvent<{
        conversationId: string;
        updates: Array<{ messageId: string; status: string }>;
      }>(visitorSocket!, "chat:messages:status");

      ownerSocket!.emit("chat:messages:read", {
        conversationId,
        messageIds: [messageId],
      });

      const payload = await statusPromise;

      assert.ok(
        payload.updates.some(
          (update) =>
            update.messageId === messageId && update.status === "READ",
        ),
      );

      await new Promise((resolve) =>
        setTimeout(resolve, STATUS_BATCH_DEBOUNCE_MS + 100),
      );
    });
  });
}
