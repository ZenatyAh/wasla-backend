function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Set it in .env (local) or your host/CI secrets. ` +
        `Auth needs JWT_SECRET; the database needs DATABASE_URL. ` +
        `Optional: TOKEN_SECRET for password-reset HMAC (defaults to JWT_SECRET if omitted).`,
    );
  }
  return value;
}

export const DATABASE_URL = requireEnv("DATABASE_URL");
export const JWT_SECRET = requireEnv("JWT_SECRET");

const explicitTokenSecret = process.env.TOKEN_SECRET?.trim();
if (!explicitTokenSecret) {
  console.warn(
    "[env] TOKEN_SECRET is not set; using JWT_SECRET for password-reset HMAC. Set TOKEN_SECRET for separate keys in production.",
  );
}

/** Used for password-reset token hashing; falls back to JWT_SECRET if unset. */
export const TOKEN_SECRET = explicitTokenSecret || JWT_SECRET;

/**
 * Recommender (FastAPI) integration. All optional: when RECOMMENDER_URL or
 * RECOMMENDER_API_KEY is unset the integration is treated as disabled — sync
 * pushes become no-ops, the feed proxy falls back to chronological, and the
 * export endpoint refuses every request (no shared secret configured).
 */
export const RECOMMENDER_URL = process.env.RECOMMENDER_URL?.trim() || "";
export const RECOMMENDER_API_KEY = process.env.RECOMMENDER_API_KEY?.trim() || "";
export const RECOMMENDER_TIMEOUT_MS = Number(
  process.env.RECOMMENDER_TIMEOUT_MS || 5000,
);

/** True when this service can push to / pull from the recommender. */
export const RECOMMENDER_ENABLED = Boolean(
  RECOMMENDER_URL && RECOMMENDER_API_KEY,
);

/** IANA timezone for contract deadline end-of-day (23:59:59.999). */
export const CONTRACT_DEADLINE_TIMEZONE =
  process.env.CONTRACT_DEADLINE_TIMEZONE?.trim() || "Asia/Jerusalem";
