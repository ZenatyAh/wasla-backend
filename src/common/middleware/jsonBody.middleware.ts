import type { ErrorRequestHandler, RequestHandler } from "express";
import express from "express";

export class JsonBodyParseError extends Error {
  readonly statusCode = 400;
  constructor(message = "Invalid JSON request body") {
    super(message);
    this.name = "JsonBodyParseError";
  }
}

/**
 * Parses JSON bodies and tolerates a common client mistake: sending a JSON-encoded
 * string that contains the real object (double stringify / quoted blob).
 */
export function parseLenientJson(raw: string): unknown {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  if (trimmed.length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const inner = JSON.parse(trimmed);
        if (typeof inner === "string") {
          try {
            return JSON.parse(inner);
          } catch {
            throw new JsonBodyParseError();
          }
        }
      } catch {
        // fall through
      }
    }
    throw new JsonBodyParseError();
  }

  if (typeof parsed === "string") {
    const s = parsed.trim();
    if (
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"))
    ) {
      try {
        return JSON.parse(s);
      } catch {
        return parsed;
      }
    }
  }

  return parsed;
}

const jsonRawParser: RequestHandler = express.raw({
  limit: process.env.JSON_BODY_LIMIT ?? "1mb",
  type: (req) => {
    const ct = req.headers["content-type"] ?? "";
    return /application\/json/i.test(ct);
  },
});

const lenientJsonParse: RequestHandler = (req, _res, next) => {
  if (!Buffer.isBuffer(req.body)) {
    return next();
  }
  const buf = req.body as Buffer;
  if (buf.length === 0) {
    req.body = {};
    return next();
  }
  try {
    req.body = parseLenientJson(buf.toString("utf8"));
  } catch (err) {
    return next(err);
  }
  next();
};

export const jsonBodyMiddleware: RequestHandler[] = [
  jsonRawParser,
  lenientJsonParse,
];

export const invalidJsonBodyHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  next,
) => {
  if (err instanceof JsonBodyParseError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  next(err);
};
