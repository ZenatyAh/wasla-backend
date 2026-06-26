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
    // #region agent log
    fetch('http://127.0.0.1:7430/ingest/c20838bf-9e24-484e-8317-a8bd52c8f7b2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d357df'},body:JSON.stringify({sessionId:'d357df',location:'internalAuth.middleware.ts:503',message:'recommender-export blocked: integration disabled',data:{recommenderEnabled:RECOMMENDER_ENABLED,hasUrl:Boolean(process.env.RECOMMENDER_URL?.trim()),hasKey:Boolean(process.env.RECOMMENDER_API_KEY?.trim())},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return res
      .status(503)
      .json({ status: "fail", message: "Recommender integration is disabled" });
  }

  const header = req.header("X-Internal-Token");
  if (!header || !tokensMatch(header, RECOMMENDER_API_KEY)) {
    // #region agent log
    fetch('http://127.0.0.1:7430/ingest/c20838bf-9e24-484e-8317-a8bd52c8f7b2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d357df'},body:JSON.stringify({sessionId:'d357df',location:'internalAuth.middleware.ts:401',message:'recommender-export blocked: invalid token',data:{hasHeader:Boolean(header)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return res
      .status(401)
      .json({ status: "fail", message: "Invalid internal token" });
  }

  // #region agent log
  fetch('http://127.0.0.1:7430/ingest/c20838bf-9e24-484e-8317-a8bd52c8f7b2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d357df'},body:JSON.stringify({sessionId:'d357df',location:'internalAuth.middleware.ts:pass',message:'recommender-export auth ok',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return next();
};
