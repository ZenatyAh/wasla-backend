import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openApiSpec } from "./openapi.js";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete"];

/** HTTP operations implemented in server.ts and module routers (OpenAPI path syntax). */
const EXPECTED_API_OPERATIONS: Array<{ method: HttpMethod; path: string }> = [
  { method: "get", path: "/" },
  { method: "get", path: "/health" },
  { method: "get", path: "/docs" },
  { method: "get", path: "/docs/openapi.json" },
  { method: "get", path: "/docs/chat-frontend" },
  { method: "get", path: "/me" },
  { method: "post", path: "/auth/register" },
  { method: "post", path: "/auth/login" },
  { method: "post", path: "/auth/forget-password" },
  { method: "post", path: "/auth/reset-password" },
  { method: "post", path: "/auth/change-password" },
  { method: "post", path: "/auth/refresh" },
  { method: "post", path: "/auth/logout" },
  { method: "get", path: "/posts" },
  { method: "post", path: "/posts" },
  { method: "get", path: "/posts/me" },
  { method: "get", path: "/posts/saved" },
  { method: "post", path: "/posts/search" },
  { method: "get", path: "/posts/{postId}" },
  { method: "patch", path: "/posts/{postId}" },
  { method: "delete", path: "/posts/{postId}" },
  { method: "post", path: "/posts/{postId}/save" },
  { method: "delete", path: "/posts/{postId}/save" },
  { method: "post", path: "/conversations" },
  { method: "post", path: "/conversations/direct" },
  { method: "get", path: "/conversations" },
  { method: "get", path: "/conversations/{conversationId}" },
  { method: "get", path: "/conversations/{conversationId}/messages" },
  { method: "post", path: "/conversations/{conversationId}/messages" },
  { method: "patch", path: "/messages/{messageId}" },
  { method: "delete", path: "/messages/{messageId}" },
  { method: "post", path: "/messages/{messageId}/read" },
  { method: "get", path: "/notifications" },
  { method: "patch", path: "/notifications/read-all" },
  { method: "patch", path: "/notifications/all/read" },
  { method: "patch", path: "/notifications/{id}/read" },
  { method: "post", path: "/users/search" },
  { method: "delete", path: "/users/account" },
  { method: "put", path: "/users/profile" },
  { method: "get", path: "/users/{id}/profile" },
  { method: "get", path: "/users/{id}/reviews" },
  { method: "post", path: "/reviews" },
  { method: "get", path: "/skills" },
  { method: "post", path: "/skills" },
  { method: "post", path: "/exchanges/request" },
  { method: "get", path: "/exchanges" },
  { method: "get", path: "/exchanges/{id}" },
  { method: "put", path: "/exchanges/{id}/accept" },
  { method: "put", path: "/exchanges/{id}/reject" },
  { method: "put", path: "/exchanges/{id}/deliver" },
  { method: "put", path: "/exchanges/{id}/confirm" },
  { method: "put", path: "/exchanges/{id}/cancel" },
  { method: "post", path: "/exchanges/{id}/dispute" },
  { method: "get", path: "/exchanges/{id}/sessions" },
  { method: "post", path: "/exchanges/{id}/sessions" },
  { method: "put", path: "/exchanges/{id}/sessions/{sessionId}/confirm" },
  { method: "put", path: "/exchanges/{id}/sessions/{sessionId}/reject" },
  { method: "post", path: "/exchanges/{id}/deadline" },
  { method: "put", path: "/exchanges/{id}/deadline/approve" },
  { method: "put", path: "/exchanges/{id}/deadline/reject" },
  { method: "get", path: "/api/v1/wallet/history" },
  { method: "get", path: "/feed/{userId}" },
  { method: "get", path: "/internal/recommender-export" },
];

const collectRefs = (value: unknown, refs = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return refs;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key === "$ref" && typeof nested === "string") {
        refs.add(nested);
      } else {
        collectRefs(nested, refs);
      }
    }
  }

  return refs;
};

const resolveRef = (ref: string): boolean => {
  if (!ref.startsWith("#/")) {
    return false;
  }

  const parts = ref.slice(2).split("/");
  let current: unknown = openApiSpec;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current !== undefined;
};

const collectOpenApiOperations = (): Array<{ method: HttpMethod; path: string }> => {
  const ops: Array<{ method: HttpMethod; path: string }> = [];

  for (const [path, item] of Object.entries(openApiSpec.paths)) {
    for (const method of HTTP_METHODS) {
      if ((item as Record<string, unknown>)[method]) {
        ops.push({ method, path });
      }
    }
  }

  return ops;
};

const sortOperations = (
  ops: Array<{ method: HttpMethod; path: string }>,
) =>
  [...ops].sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );

describe("OpenAPI spec", () => {
  it("resolves all internal $ref targets", () => {
    const refs = collectRefs(openApiSpec);
    const missing = [...refs].filter((ref) => !resolveRef(ref));

    assert.deepEqual(
      missing,
      [],
      `Unresolved OpenAPI refs: ${missing.join(", ")}`,
    );
  });

  it("documents every HTTP route exposed by the server", () => {
    const documented = collectOpenApiOperations();
    assert.deepEqual(
      sortOperations(documented),
      sortOperations(EXPECTED_API_OPERATIONS),
    );
  });

  it("does not expose a fake /realtime/chat HTTP route", () => {
    assert.equal("/realtime/chat" in openApiSpec.paths, false);
  });

  it("documents feed and internal export routes", () => {
    assert.ok("/feed/{userId}" in openApiSpec.paths);
    assert.ok("/internal/recommender-export" in openApiSpec.paths);
    assert.ok("/posts/search" in openApiSpec.paths);
    assert.ok("/users/search" in openApiSpec.paths);
  });

  it("documents skills routes", () => {
    assert.ok("/skills" in openApiSpec.paths);
    assert.ok("get" in openApiSpec.paths["/skills"]);
    assert.ok("post" in openApiSpec.paths["/skills"]);
  });

  it("documents wallet status values aligned with implementation", () => {
    const walletStatus =
      openApiSpec.components.schemas.WalletTransaction.properties.status.enum;
    assert.deepEqual(walletStatus, [
      "completed",
      "refunded",
      "held",
      "disputed",
      "cancelled",
    ]);

    const queryStatus = openApiSpec.paths["/api/v1/wallet/history"].get
      .parameters.find((param: { name?: string }) => param.name === "status")
      .schema.enum;
    assert.deepEqual(queryStatus, [
      "completed",
      "refunded",
      "held",
      "disputed",
      "cancelled",
    ]);
  });

  it("documents chat idempotency and socket payload schemas", () => {
    const sendPath = openApiSpec.paths["/conversations/{conversationId}/messages"];
    assert.ok("post" in sendPath);
    assert.ok("200" in sendPath.post.responses);
    assert.ok("409" in sendPath.post.responses);

    const schemas = openApiSpec.components.schemas;
    assert.ok("MessageStatus" in schemas);
    assert.ok("ChatMessagesDeliveredPayload" in schemas);
    assert.ok("ChatMessagesReadPayload" in schemas);
    assert.ok("ChatMessagesStatusEvent" in schemas);
    assert.ok("ChatPresenceOnlineEvent" in schemas);
    assert.ok("ChatPresenceOfflineEvent" in schemas);
    assert.ok("NotificationType" in schemas);
    assert.ok("NotificationNewEvent" in schemas);
    assert.ok("ContractNotificationNewEvent" in schemas);
    assert.ok("NotificationContractData" in schemas);

    const contractData = schemas.NotificationContractData.properties;
    assert.ok("contractEndDate" in contractData);
    assert.ok("proposedEndDate" in contractData);
    assert.ok("status" in contractData);

    const sendSchema = schemas.SendMessageRequest;
    assert.ok(Array.isArray(sendSchema.required));
    assert.ok(sendSchema.required.includes("clientMessageId"));
  });

  it("documents notification types aligned with Prisma NotificationType enum", () => {
    const notificationTypes = openApiSpec.components.schemas.NotificationType.enum;
    assert.deepEqual(notificationTypes, [
      "NEW_MESSAGE",
      "CONVERSATION_STARTED",
      "EXCHANGE_REQUESTED",
      "EXCHANGE_ACCEPTED",
      "EXCHANGE_REJECTED",
      "EXCHANGE_CANCELED",
      "SESSION_RECORDED",
      "SESSION_CONFIRMED",
      "SESSION_REJECTED",
      "DEADLINE_PROPOSED",
      "DEADLINE_APPROVED",
      "DEADLINE_REJECTED",
      "DEADLINE_APPROACHING",
      "CONTRACT_AUTO_RESOLVED",
      "CONTRACT_AUTO_COMPLETED",
      "CONTRACT_AUTO_DISPUTED",
      "CONTRACT_RESOLUTION_FAILED",
    ]);
  });

  it("documents socket room names in Chat and Notifications tags", () => {
    const chatTag = openApiSpec.tags.find((tag: { name?: string }) => tag.name === "Chat");
    const notificationsTag = openApiSpec.tags.find(
      (tag: { name?: string }) => tag.name === "Notifications",
    );

    assert.match(chatTag.description, /user:\{userId\}/);
    assert.match(chatTag.description, /conversation:\{conversationId\}/);
    assert.match(chatTag.description, /notification:new/);
    assert.match(notificationsTag.description, /notification:new/);
    assert.match(notificationsTag.description, /user:\{userId\}/);
    assert.match(notificationsTag.description, /EXCHANGE_REQUESTED/);
    assert.match(notificationsTag.description, /CONTRACT_AUTO_COMPLETED/);
    assert.match(notificationsTag.description, /CONTRACT_AUTO_DISPUTED/);
    assert.match(notificationsTag.description, /contract:notification:new/);
    assert.match(notificationsTag.description, /DEADLINE_APPROACHING/);
    assert.match(notificationsTag.description, /maximum_end_date/);

    const exchangesTag = openApiSpec.tags.find(
      (tag: { name?: string }) => tag.name === "Exchanges",
    );
    assert.match(notificationsTag.description, /canProposeExtension/);

    assert.match(exchangesTag.description, /contract:notification:new/);
    assert.match(exchangesTag.description, /DEADLINE_APPROACHING/);
    assert.match(exchangesTag.description, /Every 15 minutes/);
    assert.match(exchangesTag.description, /propose an extension/);
    assert.match(exchangesTag.description, /UC-TX-07/);
    assert.match(exchangesTag.description, /CONTRACT_AUTO_COMPLETED/);
    assert.match(exchangesTag.description, /ARCHIVED/);
    assert.match(exchangesTag.description, /auto-rejected/);

    const reviewsTag = openApiSpec.tags.find(
      (tag: { name?: string }) => tag.name === "Reviews",
    );
    assert.match(reviewsTag.description, /DISPUTED/);
    assert.match(reviewsTag.description, /RELEASED/);

    assert.match(notificationsTag.description, /CONTRACT_RESOLUTION_FAILED/);
    assert.match(notificationsTag.description, /providerCredits/);
    assert.match(notificationsTag.description, /fault/);

    assert.match(chatTag.description, /contract:notification:new/);
  });

  it("documents UC-TX-07 resolution schemas and review eligibility", () => {
    const schemas = openApiSpec.components.schemas;

    assert.ok("ResolutionFaultParty" in schemas);
    assert.deepEqual(schemas.ResolutionFaultParty.enum, [
      "NONE",
      "SEEKER",
      "PROVIDER",
    ]);

    assert.ok("WorkSessionStatus" in schemas);
    assert.deepEqual(schemas.WorkSessionStatus.enum, [
      "PENDING_CONFIRMATION",
      "CONFIRMED",
      "REJECTED",
    ]);

    assert.match(schemas.ExchangeStatus.description, /DISPUTED/);
    assert.match(schemas.EscrowStatus.description, /REFUNDED/);

    const reviewPost = openApiSpec.paths["/reviews"].post;
    assert.match(reviewPost.description, /auto-resolution/);
    assert.match(reviewPost.description, /HELD/);

    const notificationData = schemas.NotificationContractData;
    assert.ok(notificationData.properties.fault);
    assert.ok(notificationData.properties.providerCredits);
    assert.ok(notificationData.properties.refundCredits);
  });

  it("documents pending review contracts on login and refresh", () => {
    const schemas = openApiSpec.components.schemas;

    assert.ok("LoginAuthResponse" in schemas);
    assert.ok("RefreshResponse" in schemas);
    assert.ok("PendingReviewContract" in schemas);

    const loginPost = openApiSpec.paths["/auth/login"].post;
    const refreshPost = openApiSpec.paths["/auth/refresh"].post;

    assert.match(loginPost.description, /pendingReviewContracts/);
    assert.match(refreshPost.description, /pendingReviewContracts/);

    const loginSchema =
      loginPost.responses["200"].content["application/json"].schema;
    assert.equal(loginSchema.$ref, "#/components/schemas/LoginAuthResponse");

    const refreshSchema =
      refreshPost.responses["200"].content["application/json"].schema;
    assert.equal(refreshSchema.$ref, "#/components/schemas/RefreshResponse");

    assert.deepEqual(schemas.PendingReviewContract.properties.role.enum, [
      "provider",
      "requester",
    ]);
    assert.deepEqual(schemas.PendingReviewContract.properties.status.enum, [
      "COMPLETED",
      "DISPUTED",
    ]);

    const registerSchema =
      openApiSpec.paths["/auth/register"].post.responses["200"].content[
        "application/json"
      ].schema;
    assert.equal(registerSchema.$ref, "#/components/schemas/AuthResponse");
    assert.equal("pendingReviewContracts" in schemas.AuthResponse.properties, false);

    const authTag = openApiSpec.tags.find(
      (tag: { name?: string }) => tag.name === "Auth",
    );
    assert.match(authTag.description, /pendingReviewContracts/);
  });

  it("documents post archiving on contract accept", () => {
    const acceptPut = openApiSpec.paths["/exchanges/{id}/accept"].put;
    const requestPost = openApiSpec.paths["/exchanges/request"].post;

    assert.match(acceptPut.description, /ARCHIVED/);
    assert.match(acceptPut.description, /REJECTED/);
    assert.match(requestPost.description, /PUBLISHED/);
    assert.match(requestPost.description, /owned by `providerId`/);
  });
});
