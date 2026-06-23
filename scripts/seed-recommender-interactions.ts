/**
 * Seeds thousands of recommender interactions (save + apply) for AI testing.
 *
 * API mode (default):
 *   SEED_RUN_ID=mqo2h738 npx tsx scripts/seed-recommender-interactions.ts
 *
 * DB mode (fast; requires DATABASE_URL):
 *   SEED_MODE=db npx tsx scripts/seed-recommender-interactions.ts
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";

const BASE_URL = (process.env.BASE_URL || "https://wasla-backend.up.railway.app").replace(
  /\/$/,
  "",
);
const RECOMMENDER_URL = (
  process.env.RECOMMENDER_URL || "https://ahmed8sw-wasla.hf.space"
).replace(/\/$/, "");
const RECOMMENDER_API_KEY =
  process.env.RECOMMENDER_API_KEY ||
  "fd793fe2a78a60fce1c137bdf5f171273f2a0a56c91f697bb0c1359da73979f0";

const SEED_MODE = process.env.SEED_MODE || "api";
const SEED_RUN_ID = process.env.SEED_RUN_ID || "mqo2h738";
const SEED_USER_COUNT = Number(process.env.SEED_USER_COUNT || 200);
const SEED_ACCOUNTS = Number(process.env.SEED_ACCOUNTS || 50);
const INTERACTION_COUNT = Number(process.env.INTERACTION_COUNT || 3000);
const SAVE_RATIO = Number(process.env.SAVE_RATIO || 0.85);
const PASSWORD = "SeedPass@123";
const TEST_USER_ID = Number(process.env.TEST_USER_ID || 19);

type ExportPost = { post_id: string; user_id: string; post_type: string; category: string };
type ExportUser = { user_id: string; skills: string[]; needs: string[] };
type ExportPayload = {
  users: ExportUser[];
  posts: ExportPost[];
  interactions: unknown[];
};

type PlannedSave = { userId: number; postId: number };
type PlannedApply = {
  userId: number;
  postId: number;
  providerId: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(400 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const fetchExport = async (): Promise<ExportPayload> => {
  const response = await withRetry("export", () =>
    fetch(`${BASE_URL}/internal/recommender-export`, {
      headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
    }),
  );
  if (!response.ok) {
    throw new Error(`Export failed: HTTP ${response.status}`);
  }
  return (await response.json()) as ExportPayload;
};

const seedEmail = (index: number) => `rec_${SEED_RUN_ID}_${index}@seed.wasla.test`;

const loginSeedUser = async (index: number): Promise<{ userId: number; token: string } | null> => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: seedEmail(index), password: PASSWORD }),
  });
  const raw = await response.text();
  let body: { accessToken?: string; user?: { id: number }; message?: string } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    console.warn(`[interactions] Login non-JSON for index ${index}: ${raw.slice(0, 80)}`);
    return null;
  }
  if (!response.ok || !body.accessToken || !body.user?.id) {
    return null;
  }
  return { userId: body.user.id, token: body.accessToken };
};

const planInteractions = (exportData: ExportPayload, allowedUserIds: number[]) => {
  const posts = exportData.posts.map((p) => ({
    id: Number(p.post_id),
    ownerId: Number(p.user_id),
    type: p.post_type,
    category: p.category,
  }));

  const userIds =
    allowedUserIds.length > 0
      ? allowedUserIds
      : exportData.users.map((u) => Number(u.user_id)).filter((id) => Number.isInteger(id));

  const rng = mulberry32(INTERACTION_COUNT + SEED_USER_COUNT);
  const saveTarget = Math.round(INTERACTION_COUNT * SAVE_RATIO);
  const applyTarget = INTERACTION_COUNT - saveTarget;

  const saves: PlannedSave[] = [];
  const applies: PlannedApply[] = [];
  const seenSaves = new Set<string>();
  const seenApplies = new Set<string>();

  let guard = 0;
  while (saves.length < saveTarget && guard < saveTarget * 30) {
    guard++;
    const userId = userIds[Math.floor(rng() * userIds.length)]!;
    const post = posts[Math.floor(rng() * posts.length)]!;
    if (post.ownerId === userId) continue;
    const key = `${userId}:${post.id}`;
    if (seenSaves.has(key)) continue;
    seenSaves.add(key);
    saves.push({ userId, postId: post.id });
  }

  guard = 0;
  while (applies.length < applyTarget && guard < applyTarget * 30) {
    guard++;
    const userId = userIds[Math.floor(rng() * userIds.length)]!;
    const post = posts[Math.floor(rng() * posts.length)]!;
    if (post.ownerId === userId) continue;
    const key = `${userId}:${post.id}`;
    if (seenApplies.has(key)) continue;
    seenApplies.add(key);
    applies.push({ userId, postId: post.id, providerId: post.ownerId });
  }

  return { saves, applies, posts, userIds };
};

const loginSeedAccounts = async () => {
  const tokens = new Map<number, string>();
  console.log(`[interactions] Logging in up to ${SEED_ACCOUNTS} seed accounts...`);

  for (let i = 0; i < SEED_ACCOUNTS; i++) {
    const session = await loginSeedUser(i);
    if (session) {
      tokens.set(session.userId, session.token);
    }
    if ((i + 1) % 5 === 0) {
      console.log(`[interactions] Logged in ${tokens.size}/${i + 1} attempts`);
      await sleep(61_000);
    } else {
      await sleep(500);
    }
  }

  console.log(`[interactions] Active sessions: ${tokens.size}`);
  return tokens;
};

const pickToken = (tokens: Map<number, string>, userId: number) => {
  const token = tokens.get(userId);
  if (!token) {
    throw new Error(`No token for user ${userId}`);
  }
  return token;
};

const runApiMode = async (exportData: ExportPayload) => {
  const tokens = await loginSeedAccounts();
  const allowedUserIds = [...tokens.keys()];
  if (!allowedUserIds.length) {
    throw new Error("No seed accounts could be logged in");
  }

  const { saves, applies } = planInteractions(exportData, allowedUserIds);

  let savesOk = 0;
  let appliesOk = 0;
  const failures: string[] = [];
  const BATCH = 8;

  console.log(`[interactions] Creating ${saves.length} saves + ${applies.length} applies via API`);

  for (let i = 0; i < saves.length; i += BATCH) {
    const batch = saves.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (item, j) => {
        try {
          const token = pickToken(tokens, item.userId);
          const response = await withRetry(`save ${item.userId}->${item.postId}`, () =>
            fetch(`${BASE_URL}/posts/${item.postId}/save`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
          if (!response.ok) {
            const err = (await response.json()) as { message?: string };
            throw new Error(err.message ?? `HTTP ${response.status}`);
          }
          savesOk++;
        } catch (err) {
          failures.push(
            `save ${item.userId}->${item.postId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
    if ((i + BATCH) % 200 === 0 || i + BATCH >= saves.length) {
      console.log(`[interactions] Saves progress: ${Math.min(i + BATCH, saves.length)}/${saves.length}`);
    }
    await sleep(100);
  }

  for (let i = 0; i < applies.length; i += BATCH) {
    const batch = applies.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (item, j) => {
        try {
          const token = pickToken(tokens, item.userId);
          const response = await withRetry(`apply ${item.userId}->${item.postId}`, () =>
            fetch(`${BASE_URL}/exchanges/request`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                postId: item.postId,
                providerId: item.providerId,
                duration: 1,
              }),
            }),
          );
          if (!response.ok) {
            const err = (await response.json()) as { message?: string };
            throw new Error(err.message ?? `HTTP ${response.status}`);
          }
          appliesOk++;
        } catch (err) {
          failures.push(
            `apply ${item.userId}->${item.postId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
    if ((i + BATCH) % 200 === 0 || i + BATCH >= applies.length) {
      console.log(
        `[interactions] Applies progress: ${Math.min(i + BATCH, applies.length)}/${applies.length}`,
      );
    }
    await sleep(100);
  }

  console.log("\n[interactions] API seed done.");
  console.log(`  Saves: ${savesOk}/${saves.length}`);
  console.log(`  Applies: ${appliesOk}/${applies.length}`);
  console.log(`  Failures: ${failures.length}`);
  if (failures.length) {
    failures.slice(0, 5).forEach((f) => console.log(`    - ${f}`));
  }
};

const runDbMode = async (exportData: ExportPayload) => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for SEED_MODE=db");
  }

  const { saves, applies } = planInteractions(exportData, []);
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log(`[interactions] DB bulk insert: ${saves.length} saves + ${applies.length} applies`);

  let savesOk = 0;
  for (let i = 0; i < saves.length; i += 500) {
    const batch = saves.slice(i, i + 500);
    await prisma.savedPost.createMany({
      data: batch.map((s) => ({ user_id: s.userId, post_id: s.postId })),
      skipDuplicates: true,
    });
    savesOk += batch.length;
    if ((i + 500) % 1000 === 0 || i + 500 >= saves.length) {
      console.log(`[interactions] Saved posts batch: ${Math.min(i + 500, saves.length)}/${saves.length}`);
    }
  }

  let appliesOk = 0;
  for (let i = 0; i < applies.length; i += 200) {
    const batch = applies.slice(i, i + 200);
    await prisma.serviceExchange.createMany({
      data: batch.map((a) => ({
        post_id: a.postId,
        provider_id: a.providerId,
        consumer_id: a.userId,
        time_credits: 1,
        status: "PENDING" as const,
        escrow_status: "NONE" as const,
      })),
    });
    appliesOk += batch.length;
  }

  if (process.env.SYNC_TO_AI === "1") {
    console.log("[interactions] SYNC_TO_AI skipped — bootstrap reloads full export.");
  }

  await prisma.$disconnect();
  console.log("\n[interactions] DB seed done.");
  console.log(`  Saves inserted: ${savesOk}`);
  console.log(`  Applies inserted: ${appliesOk}`);
};

const bootstrapAi = async () => {
  console.log("\n[interactions] Fetching export for AI bootstrap...");
  const exportData = await fetchExport();
  console.log(
    `[interactions] Export: ${exportData.users.length} users, ${exportData.posts.length} posts, ${exportData.interactions.length} interactions`,
  );

  writeFileSync("/tmp/wasla-export-latest.json", JSON.stringify(exportData));

  const response = await withRetry("bootstrap", () =>
    fetch(`${RECOMMENDER_URL}/sync/bootstrap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": RECOMMENDER_API_KEY,
      },
      body: JSON.stringify(exportData),
    }),
  );
  const body = await response.json();
  console.log("[interactions] Bootstrap response:", JSON.stringify(body));
  if (!response.ok) {
    throw new Error(`Bootstrap failed: HTTP ${response.status}`);
  }
  return exportData;
};

const testRecommendations = async () => {
  console.log(`\n[interactions] Testing recommendations for user ${TEST_USER_ID}...`);

  const aiResponse = await withRetry("recommend", () =>
    fetch(`${RECOMMENDER_URL}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": RECOMMENDER_API_KEY,
      },
      body: JSON.stringify({ user_id: String(TEST_USER_ID), top_k: 10 }),
    }),
  );
  const aiBody = (await aiResponse.json()) as {
    count?: number;
    recommendations?: { post_id: string; score?: number }[];
  };
  console.log("[interactions] AI /recommend:", JSON.stringify(aiBody));

  const login = await loginSeedUser(0);
  if (!login) {
    console.log("[interactions] Skipping /feed test (seed user 0 login failed)");
    return;
  }

  const feedResponse = await withRetry("feed", () =>
    fetch(`${BASE_URL}/feed/${TEST_USER_ID}`, {
      headers: { Authorization: `Bearer ${login.token}` },
    }),
  );
  const feedBody = (await feedResponse.json()) as {
    source?: string;
    posts?: { id: number; title: string; category: string }[];
    message?: string;
  };

  if (!feedResponse.ok) {
    console.log("[interactions] /feed error:", feedBody.message ?? feedResponse.status);
    return;
  }

  console.log(`[interactions] /feed source: ${feedBody.source}, posts: ${feedBody.posts?.length ?? 0}`);
  feedBody.posts?.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.category}] ${p.title} (id=${p.id})`);
  });
};

const main = async () => {
  console.log(`[interactions] Mode=${SEED_MODE}, target=${INTERACTION_COUNT}, run=${SEED_RUN_ID}`);

  const exportBefore = await fetchExport();
  console.log(
    `[interactions] Current interactions in DB export: ${exportBefore.interactions.length}`,
  );

  if (SEED_MODE === "db") {
    await runDbMode(exportBefore);
  } else {
    await runApiMode(exportBefore);
  }

  await bootstrapAi();
  await testRecommendations();
};

main().catch((err) => {
  console.error("[interactions] Fatal:", err);
  process.exit(1);
});
