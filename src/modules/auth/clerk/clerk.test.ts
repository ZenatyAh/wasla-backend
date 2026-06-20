import "dotenv/config";

if (!process.env.CLERK_WEBHOOK_SECRET?.startsWith("whsec_")) {
  process.env.CLERK_WEBHOOK_SECRET = `whsec_${Buffer.from(
    "wasla_clerk_webhook_test_secret",
  ).toString("base64")}`;
}

if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = "sk_test_wasla_clerk_secret";
}

if (!process.env.CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = "pk_test_wasla_clerk_publishable";
}

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcrypt";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/backend/webhooks";

const hasTestDatabase =
  Boolean(process.env.DATABASE_URL) &&
  Boolean(process.env.JWT_SECRET) &&
  Boolean(process.env.CLERK_WEBHOOK_SECRET);

if (!hasTestDatabase) {
  describe("Clerk auth integration", () => {
    it("skips when DATABASE_URL, JWT_SECRET, and CLERK_WEBHOOK_SECRET are configured", () => {
      assert.ok(true);
    });
  });
} else {
  const request = (await import("supertest")).default;
  const { prisma } = await import("../../../lib/prisma.js");
  const { default: app } = await import("../../../server.js");
  const { loginService } = await import("../loginService.js");
  const { clerkForgotPasswordService } = await import("./clerk.password.service.js");
  const { handleClerkWebhookEvent } = await import("./clerk.webhook.service.js");
  const {
    linkOrCreateUserFromClerk,
    normalizeClerkUser,
  } = await import("./clerk.sync.service.js");

  const runId = Date.now().toString();
  const password = "TestPass@123";

  let legacyUserId = 0;
  let clerkLinkedUserId = 0;

  const clerkUserPayload = {
    id: `user_clerk_${runId}`,
    first_name: "Clerk",
    last_name: "User",
    primary_email_address_id: "email_1",
    email_addresses: [
      {
        id: "email_1",
        email_address: `clerk_${runId}@test.com`,
      },
    ],
    unsafe_metadata: {
      username: `clerk_user_${runId}`,
      full_name: "Clerk User",
    },
  };

  describe("Clerk auth integration", () => {
    before(async () => {
      const passwordHash = await bcrypt.hash(password, 10);

      const legacyUser = await prisma.user.create({
        data: {
          full_name: "Legacy User",
          username: `legacy_user_${runId}`,
          email: `legacy_${runId}@test.com`,
          password_hash: passwordHash,
        },
      });

      const clerkLinkedUser = await prisma.user.create({
        data: {
          full_name: "Clerk Linked User",
          username: `clerk_linked_${runId}`,
          email: `linked_${runId}@test.com`,
          password_hash: passwordHash,
          clerk_user_id: `user_linked_${runId}`,
        },
      });

      legacyUserId = legacyUser.id;
      clerkLinkedUserId = clerkLinkedUser.id;
    });

    after(async () => {
      await prisma.session.deleteMany({
        where: { user_id: { in: [legacyUserId, clerkLinkedUserId] } },
      });
      await prisma.passwordResetToken.deleteMany({
        where: { userId: { in: [legacyUserId, clerkLinkedUserId] } },
      });
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { receiver_id: legacyUserId },
            { receiver_id: clerkLinkedUserId },
            { sender_id: legacyUserId },
            { sender_id: clerkLinkedUserId },
            {
              receiver: {
                clerk_user_id: clerkUserPayload.id,
              },
            },
          ],
        },
      });
      await prisma.userSkill.deleteMany({
        where: {
          user: { clerk_user_id: clerkUserPayload.id },
        },
      });
      await prisma.user.deleteMany({
        where: {
          OR: [
            { id: { in: [legacyUserId, clerkLinkedUserId] } },
            { clerk_user_id: clerkUserPayload.id },
          ],
        },
      });

      await prisma.$disconnect();
    });

    it("normalizes Clerk webhook user payloads", () => {
      const normalized = normalizeClerkUser(clerkUserPayload);

      assert.equal(normalized.id, clerkUserPayload.id);
      assert.equal(normalized.emailAddresses[0]?.emailAddress, clerkUserPayload.email_addresses[0].email_address);
      assert.equal(normalized.unsafeMetadata?.username, clerkUserPayload.unsafe_metadata.username);
    });

    it("creates a local user from Clerk webhook metadata", async () => {
      const user = await linkOrCreateUserFromClerk(normalizeClerkUser(clerkUserPayload));

      assert.equal(user.clerk_user_id, clerkUserPayload.id);
      assert.equal(user.email, clerkUserPayload.email_addresses[0].email_address);
      assert.equal(user.password_hash, null);
    });

    it("blocks legacy login for Clerk-linked users", async () => {
      await assert.rejects(
        () =>
          loginService(
            { email: `linked_${runId}@test.com`, password },
            { deviceInfo: "test", ip: "127.0.0.1" },
          ),
        /Please sign in with Clerk/,
      );
    });

    it("returns a Clerk reset URL for linked users when configured", async () => {
      const previousPortalUrl = process.env.CLERK_ACCOUNT_PORTAL_URL;
      process.env.CLERK_ACCOUNT_PORTAL_URL = "https://example.accounts.dev";

      try {
        const result = await clerkForgotPasswordService(`linked_${runId}@test.com`);
        assert.equal(result.resetUrl, "https://example.accounts.dev/reset-password");
      } finally {
        process.env.CLERK_ACCOUNT_PORTAL_URL = previousPortalUrl;
      }
    });

    it("invalidates local sessions on user.updated webhook events", async () => {
      await prisma.session.create({
        data: {
          id: `session_${runId}`,
          user_id: clerkLinkedUserId,
          refresh_token: `refresh_${runId}`,
          expires_at: new Date(Date.now() + 60_000),
          device_info: "test",
          ip_address: "127.0.0.1",
        },
      });

      await handleClerkWebhookEvent({
        type: "user.updated",
        object: "event",
        data: {
          ...clerkUserPayload,
          id: `user_linked_${runId}`,
          email_addresses: [
            {
              id: "email_linked",
              email_address: `linked_${runId}@test.com`,
            },
          ],
          unsafe_metadata: {},
        },
        event_attributes: {
          http_request: {
            client_ip: "127.0.0.1",
            user_agent: "test",
          },
        },
      } as WebhookEvent);

      const remainingSessions = await prisma.session.count({
        where: { user_id: clerkLinkedUserId },
      });

      assert.equal(remainingSessions, 0);
    });

    it("rejects unsigned Clerk webhook requests", async () => {
      const response = await request(app)
        .post("/webhooks/clerk")
        .set("Content-Type", "application/json")
        .send({ type: "user.updated", data: { id: "user_test" } });

      assert.equal(response.status, 400);
    });

    it("accepts signed Clerk webhook requests", async () => {
      const payload = JSON.stringify({
        type: "user.deleted",
        object: "event",
        data: { id: `user_missing_${runId}` },
        event_attributes: {
          http_request: {
            client_ip: "127.0.0.1",
            user_agent: "test",
          },
        },
      });

      const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
      const msgId = `msg_${runId}`;
      const timestamp = new Date();
      const signature = webhook.sign(msgId, timestamp, payload);

      const response = await request(app)
        .post("/webhooks/clerk")
        .set("Content-Type", "application/json")
        .set("svix-id", msgId)
        .set("svix-timestamp", Math.floor(timestamp.getTime() / 1000).toString())
        .set("svix-signature", signature)
        .send(payload);

      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { received: true });
    });
  });
}
