/**
 * Smoke-test every path/method documented in OpenAPI against the local Express app.
 * Run: DATABASE_URL=... JWT_SECRET=... tsx scripts/test-swagger-endpoints.ts
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import request from "supertest";
import { openApiSpec } from "../src/docs/openapi.js";
import { signAccessToken } from "../src/common/utils/jwt.js";
import { prisma } from "../src/lib/prisma.js";
import app from "../src/server.js";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type Result = {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  note?: string;
};

const runId = `swagger_${Date.now()}`;
const password = "TestPass@123";

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

function collectOperations(): Array<{ method: HttpMethod; path: string; needsAuth: boolean }> {
  const ops: Array<{ method: HttpMethod; path: string; needsAuth: boolean }> = [];
  const methods: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

  for (const [path, item] of Object.entries(openApiSpec.paths)) {
    for (const method of methods) {
      const operation = (item as Record<string, unknown>)[method];
      if (!operation || typeof operation !== "object") continue;
      const security = (operation as { security?: unknown[] }).security;
      const needsAuth =
        Array.isArray(security) &&
        security.some((entry) => entry && typeof entry === "object" && "bearerAuth" in entry);
      ops.push({ method, path, needsAuth });
    }
  }

  return ops;
}

function resolvePath(
  template: string,
  ids: {
    userId: number;
    postId: number;
    conversationId: string;
    messageId: string;
    notificationId: string;
    exchangeId: number;
    otherUserId: number;
  },
): string {
  if (template.startsWith("/notifications/")) {
    return template.replace("{id}", ids.notificationId);
  }
  if (template.startsWith("/users/{id}/")) {
    return template.replace("{id}", String(ids.otherUserId));
  }
  if (template.startsWith("/exchanges/")) {
    return template.replace("{id}", String(ids.exchangeId));
  }

  return template
    .replace("{userId}", String(ids.userId))
    .replace("{postId}", String(ids.postId))
    .replace("{conversationId}", ids.conversationId)
    .replace("{messageId}", ids.messageId);
}

function minimalBody(method: HttpMethod, path: string): Record<string, unknown> | undefined {
  if (method === "get" || method === "delete") return undefined;

  if (path.includes("/auth/register")) {
    return {
      full_name: "Swagger Test User",
      username: `swagger_user_${runId}`,
      email: `swagger_${runId}@test.com`,
      password,
    };
  }
  if (path.includes("/auth/login")) {
    return { email: `swagger_${runId}@test.com`, password };
  }
  if (path.includes("/auth/forget-password")) {
    return { email: `swagger_${runId}@test.com` };
  }
  if (path.includes("/auth/reset-password")) {
    return { token: "invalid-token", password: "NewPass@123" };
  }
  if (path.includes("/auth/change-password")) {
    return { currentPassword: password, newPassword: "NewPass@456" };
  }
  if (path === "/posts" && method === "post") {
    return {
      title: "Swagger test post",
      description: "Created by swagger endpoint smoke test",
      category: "OFFER",
      serviceMode: "ONLINE",
      assignedTimeCredits: 2,
    };
  }
  if (path.includes("/posts/search")) {
    return { query: "swagger" };
  }
  if (path.includes("/posts/{postId}") && method === "patch") {
    return { title: "Updated swagger post" };
  }
  if (path.includes("/conversations/direct")) {
    return { userId: 0 };
  }
  if (path === "/conversations" && method === "post") {
    return { participantIds: [] };
  }
  if (path.includes("/messages") && method === "post") {
    return { content: "swagger smoke test message", clientMessageId: `cmid_${runId}` };
  }
  if (path.includes("/messages/{messageId}") && method === "patch") {
    return { content: "edited swagger message" };
  }
  if (path.includes("/users/search")) {
    return { query: "swagger" };
  }
  if (path.includes("/users/profile")) {
    return { bio: "Swagger test bio" };
  }
  if (path.includes("/reviews")) {
    return { revieweeId: 0, rating: 5, comment: "Swagger test review" };
  }
  if (path.includes("/skills") && method === "post") {
    return { name: `Swagger Skill ${runId}`, category: "GENERAL" };
  }
  if (path.includes("/exchanges/request")) {
    return { postId: 0, providerId: 0, duration: 1 };
  }
  if (path.includes("/exchanges/{id}/dispute")) {
    return { reason: "Swagger smoke test dispute" };
  }

  return {};
}

function isAcceptableStatus(
  status: number,
  method: HttpMethod,
  path: string,
  needsAuth: boolean,
  hasToken: boolean,
): { ok: boolean; note?: string } {
  if (status === 404) return { ok: false, note: "route not found" };

  if (path.includes("/internal/recommender-export") && status === 503) {
    return { ok: true, note: "recommender integration disabled (expected when RECOMMENDER_URL/KEY unset)" };
  }

  if (status >= 500) return { ok: false, note: "server error" };

  if (needsAuth && !hasToken && status === 401) {
    return { ok: true, note: "auth required (expected 401 without token)" };
  }

  if (path.includes("/internal/recommender-export") && status === 401) {
    return { ok: true, note: "internal token required" };
  }

  if (path.includes("/auth/reset-password") && status === 400) {
    return { ok: true, note: "invalid reset token (expected)" };
  }

  if (path.includes("/auth/forget-password") && (status === 200 || status === 202)) {
    return { ok: true, note: "forget-password accepted" };
  }

  if (status >= 200 && status < 300) {
    return { ok: true };
  }

  if (status >= 400 && status < 500) {
    return { ok: true, note: `client error ${status} (route reachable)` };
  }

  return { ok: false, note: `unexpected status ${status}` };
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    console.error("Set DATABASE_URL and JWT_SECRET before running this script.");
    process.exit(1);
  }

  const createdUserIds: number[] = [];
  const createdPostIds: number[] = [];
  const createdSkillIds: number[] = [];
  let conversationIdStr = "";
  let messageIdStr = "";
  let notificationIdStr = "";
  let exchangeId = 0;

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      full_name: "Swagger Smoke User",
      username: `swagger_user_${runId}`,
      email: `swagger_${runId}@test.com`,
      password_hash: passwordHash,
      available_balance: 10,
    },
  });
  createdUserIds.push(user.id);

  const otherUser = await prisma.user.create({
    data: {
      full_name: "Swagger Other User",
      username: `swagger_other_${runId}`,
      email: `swagger_other_${runId}@test.com`,
      password_hash: passwordHash,
      available_balance: 10,
    },
  });
  createdUserIds.push(otherUser.id);

  const token = signAccessToken(String(user.id));

  const post = await prisma.post.create({
    data: {
      user_id: user.id,
      title: "Swagger fixture post",
      description: "Fixture for swagger endpoint tests",
      category: "OFFER",
      service_mode: "ONLINE",
      assigned_time_credits: 2,
      status: "PUBLISHED",
    },
  });
  createdPostIds.push(post.id);

  const conversation = await prisma.conversation.create({
    data: {
      directKey: `swagger_${runId}`,
      participants: {
        create: [{ userId: user.id }, { userId: otherUser.id }],
      },
    },
  });
  conversationIdStr = conversation.id;

  const message = await prisma.message.create({
    data: {
      conversationId: conversationIdStr,
      senderId: user.id,
      body: "Swagger fixture message",
    },
  });
  messageIdStr = message.id;

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: "NEW_MESSAGE",
      title: "Swagger fixture",
      body: "Fixture notification",
    },
  });
  notificationIdStr = notification.id;

  const exchangeResponse = await request(app)
    .post("/exchanges/request")
    .set(authHeader(token))
    .send({ postId: post.id, providerId: otherUser.id, duration: 1 });
  if (exchangeResponse.status >= 200 && exchangeResponse.status < 300) {
    exchangeId = exchangeResponse.body.exchange?.id ?? exchangeResponse.body.id ?? 0;
  }

  const ids = {
    userId: user.id,
    postId: post.id,
    conversationId: conversationIdStr,
    messageId: messageIdStr,
    notificationId: notificationIdStr,
    exchangeId: exchangeId || 1,
    otherUserId: otherUser.id,
  };

  const results: Result[] = [];
  const operations = collectOperations();

  for (const op of operations) {
    const resolvedPath = resolvePath(op.path, ids);
    const body = minimalBody(op.method, op.path);
    if (body) {
      if ("userId" in body && body.userId === 0) body.userId = ids.otherUserId;
      if ("participantIds" in body && Array.isArray(body.participantIds)) {
        body.participantIds = [ids.otherUserId];
      }
      if ("revieweeId" in body && body.revieweeId === 0) body.revieweeId = ids.otherUserId;
      if ("postId" in body && body.postId === 0) body.postId = ids.postId;
      if ("providerId" in body && body.providerId === 0) body.providerId = ids.otherUserId;
    }

    const agent = request(app)[op.method](resolvedPath);
    if (op.needsAuth || op.path.startsWith("/me") || op.path.startsWith("/posts/me")) {
      agent.set(authHeader(token));
    }
    if (op.path.includes("/internal/recommender-export") && process.env.RECOMMENDER_API_KEY) {
      agent.set("X-Internal-Token", process.env.RECOMMENDER_API_KEY);
    }

    const response = body ? await agent.send(body) : await agent;
    const verdict = isAcceptableStatus(
      response.status,
      op.method,
      op.path,
      op.needsAuth,
      true,
    );

    const result = {
      method: op.method.toUpperCase(),
      path: op.path,
      status: response.status,
      ok: verdict.ok,
      note: verdict.note,
    };
    results.push(result);

    // #region agent log
    fetch('http://127.0.0.1:7430/ingest/c20838bf-9e24-484e-8317-a8bd52c8f7b2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d357df'},body:JSON.stringify({sessionId:'d357df',location:'test-swagger-endpoints.ts',message:'endpoint smoke result',data:result,timestamp:Date.now(),hypothesisId:result.ok?'pass':'fail'}),signal:AbortSignal.timeout(300)}).catch(()=>{});
    // #endregion
  }

  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.message.deleteMany({ where: { conversationId: conversationIdStr } });
  await prisma.conversationParticipant.deleteMany({
    where: { conversationId: conversationIdStr },
  });
  await prisma.conversation.deleteMany({ where: { id: conversationIdStr } });
  if (exchangeId) {
    await prisma.transaction.deleteMany({
      where: {
        OR: [{ sender_id: user.id }, { receiver_id: user.id }],
      },
    });
    await prisma.serviceExchange.deleteMany({
      where: { id: exchangeId },
    });
  }
  await prisma.post.deleteMany({ where: { id: { in: createdPostIds } } });
  await prisma.skill.deleteMany({ where: { id: { in: createdSkillIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log("\n=== Swagger Endpoint Smoke Test ===\n");
  console.log(`Total documented operations: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}\n`);

  for (const result of results) {
    const mark = result.ok ? "✓" : "✗";
    const note = result.note ? ` — ${result.note}` : "";
    console.log(`${mark} ${result.method.padEnd(6)} ${result.path} → ${result.status}${note}`);
  }

  if (failed.length > 0) {
    console.log("\nFailed endpoints:");
    for (const result of failed) {
      console.log(`  ${result.method} ${result.path} → ${result.status} ${result.note ?? ""}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
