import type { WebhookEvent } from "@clerk/backend/webhooks";
import {
  invalidateLocalUserSessions,
  linkOrCreateUserFromClerk,
  normalizeClerkUser,
  softDeleteLocalUserByClerkId,
  syncLocalUserFromClerk,
} from "./clerk.sync.service.js";

export const handleClerkWebhookEvent = async (event: WebhookEvent) => {
  switch (event.type) {
    case "user.created": {
      await linkOrCreateUserFromClerk(normalizeClerkUser(event.data));
      return;
    }

    case "user.updated": {
      const clerkUser = normalizeClerkUser(event.data);
      await syncLocalUserFromClerk(clerkUser);
      await invalidateLocalUserSessions(clerkUser.id);
      return;
    }

    case "user.deleted": {
      const clerkUserId =
        typeof event.data === "object" &&
        event.data !== null &&
        "id" in event.data &&
        typeof event.data.id === "string"
          ? event.data.id
          : null;

      if (!clerkUserId) {
        return;
      }

      await softDeleteLocalUserByClerkId(clerkUserId);
      return;
    }

    default:
      return;
  }
};
