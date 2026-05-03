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
