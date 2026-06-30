/**
 * Backfill interactions for an existing Arabic seed run.
 *   SEED_RUN_ID=armqqk5hxj npx tsx scripts/seed-arabic-interactions-only.ts
 */
import "dotenv/config";

const RUN_ID = process.env.SEED_RUN_ID || "armqqk5hxj";
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
const PASSWORD = "SeedPass@123";
const USER_COUNT = Number(process.env.SEED_USER_COUNT || 10);
const INTERACTIONS_PER_USER = Number(process.env.INTERACTIONS_PER_USER || 6);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const loginUser = async (index: number) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `ar_${RUN_ID}_${index}@seed.wasla.test`,
        password: PASSWORD,
      }),
    });
    const raw = await loginRes.text();
    let login: { accessToken?: string; user?: { id: number }; message?: string };
    try {
      login = JSON.parse(raw) as typeof login;
    } catch {
      console.warn(`[interactions] login non-JSON (attempt ${attempt + 1}): ${raw.slice(0, 80)}`);
      await sleep(15_000);
      continue;
    }
    if (login.accessToken && login.user?.id) {
      return { userId: login.user.id, token: login.accessToken };
    }
    console.warn(`[interactions] login failed index ${index}: ${login.message ?? loginRes.status}`);
    await sleep(5_000);
  }
  return null;
};

const main = async () => {
  const exportRes = await fetch(`${BASE_URL}/internal/recommender-export`, {
    headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
  });
  const exp = (await exportRes.json()) as {
    posts: { post_id: string; user_id: string }[];
    interactions: unknown[];
  };
  const posts = exp.posts.map((p) => ({
    id: Number(p.post_id),
    ownerId: Number(p.user_id),
  }));

  let saves = 0;
  let applies = 0;

  for (let i = 0; i < USER_COUNT; i++) {
    const session = await loginUser(i);
    if (!session) {
      continue;
    }

    const { userId, token } = session;
    const ownPosts = posts.filter((p) => p.ownerId === userId);
    const othersPosts = posts.filter((p) => p.ownerId !== userId);
    const providerIds = [...new Set(posts.map((p) => p.ownerId))].filter(
      (id) => id !== userId,
    );
    if (othersPosts.length === 0 || ownPosts.length === 0 || providerIds.length === 0) {
      continue;
    }

    const saveOffset = (i * 3) % Math.max(othersPosts.length - INTERACTIONS_PER_USER, 1);
    const saveTargets = othersPosts.slice(saveOffset, saveOffset + INTERACTIONS_PER_USER);
    const applyOffset = (i * 5) % Math.max(ownPosts.length - INTERACTIONS_PER_USER, 1);
    const applyTargets = ownPosts.slice(applyOffset, applyOffset + INTERACTIONS_PER_USER);

    for (let j = 0; j < saveTargets.length; j++) {
      const target = saveTargets[j]!;
      const r = await fetch(`${BASE_URL}/posts/${target.id}/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) saves++;
      await sleep(200);
    }

    for (let j = 0; j < applyTargets.length; j++) {
      const target = applyTargets[j]!;
      const providerId = providerIds[(userId + j) % providerIds.length]!;
      const r = await fetch(`${BASE_URL}/exchanges/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postId: target.id,
          providerId,
          duration: 1,
          contractEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (r.ok) applies++;
      await sleep(200);
    }
    console.log(
      `[interactions] user ${userId}: ${saveTargets.length + applyTargets.length} attempts`,
    );
    await sleep(2_000);
  }

  console.log(`[interactions] saves=${saves}, applies=${applies}`);

  const export2Res = await fetch(`${BASE_URL}/internal/recommender-export`, {
    headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
  });
  const export2 = await export2Res.json();
  console.log(
    `[interactions] export: ${export2.interactions.length} interactions total`,
  );

  const boot = await fetch(`${RECOMMENDER_URL}/sync/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": RECOMMENDER_API_KEY,
    },
    body: JSON.stringify(export2),
  });
  console.log("[interactions] bootstrap:", await boot.json());
  console.log("[interactions] ready:", await (await fetch(`${RECOMMENDER_URL}/ready`)).json());
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
