import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import {
  RECOMMENDER_API_KEY,
  RECOMMENDER_ENABLED,
} from "../../common/utils/env.js";

const tokensMatch = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
};

/**
 * Guards internal endpoints with the shared recommender secret sent as
 * `X-Internal-Token`. When no secret is configured the endpoint is locked down
 * (503) rather than left open.
 */
export const internalTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!RECOMMENDER_ENABLED) {
    return res
      .status(503)
      .json({ status: "fail", message: "Recommender integration is disabled" });
  }

  const header = req.header("X-Internal-Token");
  if (!header || !tokensMatch(header, RECOMMENDER_API_KEY)) {
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid internal token" });
  }

  return next();
};
