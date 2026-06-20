import { createClerkClient, type ClerkClient } from "@clerk/backend";
import { CLERK_SECRET_KEY } from "../common/utils/env.js";

let clerkClient: ClerkClient | null = null;

export const getClerkClient = (): ClerkClient => {
  if (!CLERK_SECRET_KEY) {
    throw new Error("Clerk is not configured. Set CLERK_SECRET_KEY.");
  }

  if (!clerkClient) {
    clerkClient = createClerkClient({
      secretKey: CLERK_SECRET_KEY,
    });
  }

  return clerkClient;
};
