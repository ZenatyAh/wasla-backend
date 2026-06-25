/**
 * Smoke-test feed + search against a live backend and the AI recommender.
 *
 *   BASE_URL=https://wasla-backend.up.railway.app \
 *   RECOMMENDER_URL=https://ahmed8sw-wasla.hf.space \
 *   npx tsx scripts/test-recommender-production.ts
 */
import "dotenv/config";

const BASE_URL = (process.env.BASE_URL || "https://wasla-backend.up.railway.app").replace(
  /\/$/,
  "",
);
const RECOMMENDER_URL = (process.env.RECOMMENDER_URL || "https://ahmed8sw-wasla.hf.space").replace(
  /\/$/,
  "",
);
const RECOMMENDER_API_KEY = process.env.RECOMMENDER_API_KEY || "";
const LOGIN_EMAIL = process.env.TEST_LOGIN_EMAIL || "wasla_wasla42_99@seed.wasla.test";
const LOGIN_PASSWORD = process.env.TEST_LOGIN_PASSWORD || "SeedPass@123";
const TEST_USER_ID = Number(process.env.TEST_USER_ID || 123);
const SEARCH_QUERY = process.env.TEST_SEARCH_QUERY || "برمجة";

const section = (title: string) => console.log(`\n=== ${title} ===`);

const main = async () => {
  section("Backend health");
  const health = await fetch(`${BASE_URL}/health`);
  console.log("status", health.status, await health.text());

  section("AI recommender ready");
  const readyRes = await fetch(`${RECOMMENDER_URL}/ready`);
  console.log("status", readyRes.status, await readyRes.text());

  section("Login");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  const loginBody = (await loginRes.json()) as {
    accessToken?: string;
    user?: { id: number };
    message?: string;
  };
  if (!loginRes.ok || !loginBody.accessToken) {
    throw new Error(`Login failed: ${loginBody.message ?? loginRes.status}`);
  }
  const token = loginBody.accessToken;
  const userId = loginBody.user?.id ?? TEST_USER_ID;
  console.log("userId", userId);

  section("Feed (recommend vs fallback)");
  const feedRes = await fetch(`${BASE_URL}/feed/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const feedBody = (await feedRes.json()) as {
    source?: string;
    posts?: { id: number; title: string }[];
    message?: string;
  };
  console.log("status", feedRes.status, "source", feedBody.source);
  feedBody.posts?.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. [${p.id}] ${p.title}`);
  });

  section("Post search");
  const searchRes = await fetch(`${BASE_URL}/posts/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: SEARCH_QUERY, topK: 5, threshold: 0.3 }),
  });
  const searchBody = (await searchRes.json()) as {
    source?: string;
    count?: number;
    results?: Array<{
      post: { id: number; title: string };
      scores: { finalScore: number; similarityScore: number } | null;
    }>;
    message?: string;
  };
  console.log("status", searchRes.status, "source", searchBody.source, "count", searchBody.count);
  searchBody.results?.forEach((r, i) => {
    const sc = r.scores
      ? `final=${r.scores.finalScore.toFixed(3)} sim=${r.scores.similarityScore.toFixed(3)}`
      : "no scores";
    console.log(`  ${i + 1}. [${r.post.id}] ${r.post.title} (${sc})`);
  });

  if (RECOMMENDER_API_KEY) {
    section("AI /recommend direct");
    const recRes = await fetch(`${RECOMMENDER_URL}/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": RECOMMENDER_API_KEY,
      },
      body: JSON.stringify({ user_id: String(userId), top_k: 5 }),
    });
    console.log("status", recRes.status, await recRes.text());
  } else {
    console.log("\n(Skipping direct AI /recommend — RECOMMENDER_API_KEY not set)");
  }
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
