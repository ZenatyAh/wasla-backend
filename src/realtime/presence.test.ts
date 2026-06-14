import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

process.env.PRESENCE_OFFLINE_DEBOUNCE_MS = "50";

const hasTestDatabase = Boolean(process.env.DATABASE_URL);

if (!hasTestDatabase) {
  describe("Presence", () => {
    it("skips when DATABASE_URL is not configured", () => {
      assert.ok(true);
    });
  });
} else {
  const { prisma } = await import("../lib/prisma.js");
  const {
    handleUserConnect,
    handleUserDisconnect,
    isUserOnline,
    resetPresenceState,
    PRESENCE_OFFLINE_DEBOUNCE_MS,
  } = await import("./presence.js");

  describe("Presence", () => {
    let userId = 0;

    before(async () => {
      resetPresenceState();

      const user = await prisma.user.create({
        data: {
          full_name: "Presence Test User",
          username: `presence_user_${Date.now()}`,
          email: `presence_user_${Date.now()}@test.com`,
          password_hash: "hash",
        },
      });

      userId = user.id;
    });

    after(async () => {
      resetPresenceState();
      await prisma.user.delete({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it("keeps user online with multiple sockets until the last disconnects", () => {
      handleUserConnect(userId, "socket-a");
      handleUserConnect(userId, "socket-b");

      assert.equal(isUserOnline(userId), true);

      handleUserDisconnect(userId, "socket-a");
      assert.equal(isUserOnline(userId), true);

      handleUserDisconnect(userId, "socket-b");
      assert.equal(isUserOnline(userId), false);

      resetPresenceState();
    });

    it("debounces offline DB sync after the last socket disconnects", async () => {
      resetPresenceState();
      handleUserConnect(userId, "socket-only");

      await prisma.user.update({
        where: { id: userId },
        data: { is_online: true, last_seen: null },
      });

      handleUserDisconnect(userId, "socket-only");

      const beforeDebounce = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_online: true },
      });

      assert.equal(beforeDebounce?.is_online, true);

      await new Promise((resolve) =>
        setTimeout(resolve, PRESENCE_OFFLINE_DEBOUNCE_MS + 100),
      );

      const afterDebounce = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_online: true, last_seen: true },
      });

      assert.equal(afterDebounce?.is_online, false);
      assert.ok(afterDebounce?.last_seen);
    });

    it("cancels offline debounce when user reconnects within the window", async () => {
      resetPresenceState();
      handleUserConnect(userId, "socket-temp");

      await prisma.user.update({
        where: { id: userId },
        data: { is_online: true, last_seen: null },
      });

      handleUserDisconnect(userId, "socket-temp");

      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(PRESENCE_OFFLINE_DEBOUNCE_MS / 2)),
      );

      handleUserConnect(userId, "socket-reconnect");

      await new Promise((resolve) =>
        setTimeout(resolve, PRESENCE_OFFLINE_DEBOUNCE_MS + 100),
      );

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { is_online: true },
      });

      assert.equal(user?.is_online, true);
    });
  });
}
