import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { io as ioClient, type Socket } from "socket.io-client";
import {
  startSocketTestServer,
  waitForSocketEvent,
} from "../chat/chat.test.helpers.js";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) && Boolean(process.env.JWT_SECRET);

if (!hasTestDatabase) {
  describe("Notification Socket.IO", () => {
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
  const { contractEndDateDaysAhead } = await import(
    "../../common/utils/contractDeadline.js"
  );

  const runId = `${Date.now()}_notif_socket`;
  const password = "TestPass@123";

  let ownerId = 0;
  let visitorId = 0;
  let providerId = 0;
  let requesterId = 0;
  let postId = 0;
  let servicePostId = 0;
  let conversationId = "";

  let ownerToken = "";
  let visitorToken = "";
  let providerToken = "";
  let requesterToken = "";
  let baseUrl = "";

  let ownerSocket: Socket | null = null;
  let visitorSocket: Socket | null = null;
  let providerSocket: Socket | null = null;
  let closeServer: (() => Promise<void>) | null = null;

  const authHeader = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const connectClient = (token: string) =>
    ioClient(baseUrl, {
      transports: ["websocket"],
      auth: { token },
    });

  describe("Notification Socket.IO", () => {
    before(async () => {
      const testServer = await startSocketTestServer(app, initSocket);
      baseUrl = testServer.baseUrl;
      closeServer = testServer.close;

      const passwordHash = await bcrypt.hash(password, 10);

      const owner = await prisma.user.create({
        data: {
          full_name: "Notif Socket Owner",
          username: `notif_owner_${runId}`,
          email: `notif_owner_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const visitor = await prisma.user.create({
        data: {
          full_name: "Notif Socket Visitor",
          username: `notif_visitor_${runId}`,
          email: `notif_visitor_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const provider = await prisma.user.create({
        data: {
          full_name: "Notif Socket Provider",
          username: `notif_provider_${runId}`,
          email: `notif_provider_${runId}@test.com`,
          password_hash: passwordHash,
          available_balance: 5,
        },
      });

      const requester = await prisma.user.create({
        data: {
          full_name: "Notif Socket Requester",
          username: `notif_requester_${runId}`,
          email: `notif_requester_${runId}@test.com`,
          password_hash: passwordHash,
          available_balance: 5,
        },
      });

      ownerId = owner.id;
      visitorId = visitor.id;
      providerId = provider.id;
      requesterId = requester.id;

      ownerToken = signAccessToken(String(ownerId));
      visitorToken = signAccessToken(String(visitorId));
      providerToken = signAccessToken(String(providerId));
      requesterToken = signAccessToken(String(requesterId));

      const chatPost = await prisma.post.create({
        data: {
          user_id: ownerId,
          title: "Notification socket chat post title",
          description: "Notification socket chat post description",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 10,
        },
      });

      const servicePost = await prisma.post.create({
        data: {
          user_id: providerId,
          title: "Notification socket service post",
          description: "Service post for contract notification test",
          category: "OFFER",
          service_mode: "ONLINE",
          assigned_time_credits: 3,
        },
      });

      postId = chatPost.id;
      servicePostId = servicePost.id;

      const conversationResponse = await request(app)
        .post("/conversations")
        .set(authHeader(visitorToken))
        .send({ postId });

      conversationId = conversationResponse.body.conversation.id;

      ownerSocket = connectClient(ownerToken);
      visitorSocket = connectClient(visitorToken);
      providerSocket = connectClient(providerToken);

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          ownerSocket?.once("connect", () => resolve());
          ownerSocket?.once("connect_error", reject);
        }),
        new Promise<void>((resolve, reject) => {
          visitorSocket?.once("connect", () => resolve());
          visitorSocket?.once("connect_error", reject);
        }),
        new Promise<void>((resolve, reject) => {
          providerSocket?.once("connect", () => resolve());
          providerSocket?.once("connect_error", reject);
        }),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    after(async () => {
      ownerSocket?.disconnect();
      visitorSocket?.disconnect();
      providerSocket?.disconnect();

      if (closeServer) {
        await closeServer();
      }

      await prisma.notification.deleteMany({
        where: {
          userId: { in: [ownerId, visitorId, providerId, requesterId] },
        },
      });
      await prisma.serviceExchange.deleteMany({
        where: {
          OR: [
            { provider_id: providerId },
            { consumer_id: requesterId },
          ],
        },
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
        where: { id: { in: [postId, servicePostId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [ownerId, visitorId, providerId, requesterId] } },
      });

      await prisma.$disconnect();
    });

    it("delivers notification:new to recipient user room on chat message", async () => {
      const eventPromise = waitForSocketEvent<{
        type: string;
        userId: number;
        data: { conversationId: string; messageId: string };
      }>(ownerSocket!, "notification:new");

      const sendResponse = await request(app)
        .post(`/conversations/${conversationId}/messages`)
        .set(authHeader(visitorToken))
        .send({ body: "رسالة لاختبار الإشعار", clientMessageId: randomUUID() });

      assert.equal(sendResponse.status, 201);

      const payload = await eventPromise;

      assert.equal(payload.type, "NEW_MESSAGE");
      assert.equal(payload.userId, ownerId);
      assert.equal(payload.data.conversationId, conversationId);
      assert.equal(payload.data.messageId, sendResponse.body.message.id);
    });

    it("delivers notification:new to provider on exchange request", async () => {
      const eventPromise = waitForSocketEvent<{
        type: string;
        userId: number;
        data: {
          contractId: number;
          contractEndDate: string;
          proposedEndDate: string | null;
          status: string;
        };
      }>(providerSocket!, "notification:new");

      const contractEventPromise = waitForSocketEvent<{
        type: string;
      }>(providerSocket!, "contract:notification:new");

      const contractEndDate = contractEndDateDaysAhead(7);

      const requestResponse = await request(app)
        .post("/exchanges/request")
        .set(authHeader(requesterToken))
        .send({
          postId: servicePostId,
          providerId,
          duration: 3,
          contractEndDate,
        });

      assert.equal(requestResponse.status, 201);

      const payload = await eventPromise;
      const contractPayload = await contractEventPromise;

      assert.equal(payload.type, "EXCHANGE_REQUESTED");
      assert.equal(payload.userId, providerId);
      assert.equal(payload.data.contractId, requestResponse.body.exchange.id);
      assert.ok(payload.data.contractEndDate);
      assert.equal(payload.data.proposedEndDate, null);
      assert.equal(payload.data.status, "PENDING");
      assert.equal(contractPayload.type, "EXCHANGE_REQUESTED");
    });
  });
}
