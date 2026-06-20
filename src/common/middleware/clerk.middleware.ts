import type { NextFunction, Request, Response } from "express";
import { clerkMiddleware } from "@clerk/express";
import { getClerkClient } from "../../lib/clerk.js";
import {
  CLERK_PUBLISHABLE_KEY,
  CLERK_SESSION_ENABLED,
} from "../utils/env.js";

export const clerkAuthMiddleware = CLERK_SESSION_ENABLED
  ? clerkMiddleware({
      clerkClient: getClerkClient(),
      publishableKey: CLERK_PUBLISHABLE_KEY,
    })
  : (_req: Request, _res: Response, next: NextFunction) => next();
