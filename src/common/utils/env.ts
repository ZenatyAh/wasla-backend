function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Set it in .env (local) or your host/CI secrets. ` +
        `Auth and password reset need JWT_SECRET and TOKEN_SECRET; the database needs DATABASE_URL.`,
    );
  }
  return value;
}

export const JWT_SECRET = requireEnv("JWT_SECRET");
export const DATABASE_URL = requireEnv("DATABASE_URL");
export const TOKEN_SECRET = requireEnv("TOKEN_SECRET");
