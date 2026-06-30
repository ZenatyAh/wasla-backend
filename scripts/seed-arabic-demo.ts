/**
 * Seeds 10 Arabic users in Gaza × 10 Arabic posts + interactions, then bootstraps AI.
 * Skills are loaded from GET /skills (DB). Users keep the natural 5-credit welcome balance.
 *
 *   npx tsx scripts/seed-arabic-demo.ts
 */
import "dotenv/config";

const USER_COUNT = Number(process.env.SEED_USER_COUNT || 10);
const POSTS_PER_USER = Number(process.env.SEED_POSTS_PER_USER || 10);
const INTERACTIONS_PER_USER = Number(process.env.INTERACTIONS_PER_USER || 6);
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
const RUN_ID = process.env.SEED_RUN_ID || `gz${Date.now().toString(36)}`;
const PASSWORD = "SeedPass@123";
const LOCATION = "غزة";

const GAZA_NAMES = [
  "أحمد الشريف",
  "فاطمة أبو عمر",
  "محمد الحلو",
  "سارة أبو كليب",
  "يوسف عساف",
  "نور البطش",
  "خالد أبو راس",
  "لينا الشاعر",
  "عمر المغاري",
  "رنا أبو شaban",
];

const OFFER_TITLES = [
  "عرض مهارات: {skills}",
  "متاح في غزة لـ {skills}",
  "أقدم خدمات {skills} بجودة عالية",
  "تبادل مهارات — {skills}",
  "خدمة {skills} أونلاين وفي غزة",
];

const REQUEST_TITLES = [
  "أبحث عن مساعدة في {skills}",
  "مطلوب في غزة: {skills}",
  "طلب خدمة — {skills}",
  "أحتاج تعاوناً في {skills}",
  "أرغب بالتبادل في مجالات {skills}",
];

const DESCRIPTIONS = [
  "منشور عربي على منصة وصلة في غزة. الخدمة تشمل عدة مهارات مترابطة مع تواصل سريع ومواعيد مرنة.",
  "أبحث عن تبادل مهارات عادل داخل غزة. التفاصيل واضحة والتعاون يتم عبر التطبيق بكل شفافية.",
  "محتوى غني بالمهارات لاختبار نظام التوصيات الذكي. المنشور موجه لمستخدمي غزة ويدعم التعلم المتبادل.",
  "خدمة موثوقة في قطاع غزة مع خبرة عملية في المجالات المذكورة أدناه.",
];

type UserProfile = {
  name: string;
  offer: string[];
  need: string[];
};

type CreatedUser = { id: number; email: string; token: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(500 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const pick = <T>(arr: T[], index: number): T => arr[index % arr.length]!;

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

const joinSkills = (skills: string[]) => {
  if (skills.length <= 1) return skills[0] ?? "";
  if (skills.length === 2) return `${skills[0]} و${skills[1]}`;
  return `${skills.slice(0, -1).join("، ")} و${skills.at(-1)}`;
};

/** Load approved skill names from the live DB via GET /skills. */
const fetchDbSkills = async (): Promise<string[]> => {
  const response = await withRetry("skills", () =>
    fetch(`${BASE_URL}/skills?limit=200`),
  );
  if (!response.ok) {
    throw new Error(`Skills fetch failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { skills?: { name: string }[] };
  const names = (body.skills ?? [])
    .map((s) => s.name.trim())
    .filter((name) => name.length > 0);
  if (names.length < 8) {
    throw new Error(`Not enough skills in DB (got ${names.length})`);
  }
  return names;
};

/** Build 10 Gaza user profiles using distinct skill slices from the DB pool. */
const buildUserProfiles = (allSkills: string[]): UserProfile[] => {
  const profiles: UserProfile[] = [];
  const skillsPerUser = 4;
  const stride = Math.max(1, Math.floor(allSkills.length / USER_COUNT));

  for (let i = 0; i < USER_COUNT; i++) {
    const sliceStart = (i * stride) % allSkills.length;
    const slice = Array.from({ length: skillsPerUser }, (_, j) =>
      pick(allSkills, sliceStart + j),
    );
    profiles.push({
      name: GAZA_NAMES[i % GAZA_NAMES.length]!,
      offer: unique([slice[0]!, slice[1]!]),
      need: unique([slice[2]!, slice[3]!]),
    });
  }
  return profiles;
};

const pickPostSkills = (
  profile: UserProfile,
  kind: "offer" | "request",
  postIndex: number,
): string[] => {
  const pool = kind === "offer" ? profile.offer : profile.need;
  const other = kind === "offer" ? profile.need : profile.offer;
  return unique([
    pick(pool, postIndex),
    pick(pool, postIndex + 1),
    pick(other, postIndex),
  ]).slice(0, 3);
};

/** 1–5 credits so posts stay affordable with the default 5-credit balance. */
const postCredits = (userIndex: number, postIndex: number) =>
  1 + ((userIndex * 3 + postIndex) % 5);

const createUser = async (index: number, profile: UserProfile): Promise<CreatedUser> => {
  const email = `gz_${RUN_ID}_${index}@seed.wasla.test`;
  const username = `gz${RUN_ID}${index}`.slice(0, 50);

  const response = await withRetry(`register ${email}`, () =>
    fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: profile.name,
        username,
        email,
        password: PASSWORD,
        location: LOCATION,
        offeredSkills: profile.offer,
        requiredSkills: profile.need,
      }),
    }),
  );

  const body = (await response.json()) as {
    accessToken?: string;
    user?: { id: number };
    message?: string;
    errors?: { path?: string; message?: string }[];
  };

  if (!response.ok) {
    const detail =
      body.errors?.map((e) => `${e.path}: ${e.message}`).join("; ") ??
      body.message ??
      String(response.status);
    throw new Error(`Register failed: ${detail}`);
  }

  const userId = body.user?.id;
  const token = body.accessToken;
  if (!userId || !token) {
    throw new Error(`Register missing id/token for ${email}`);
  }

  return { id: userId, email, token };
};

const createPosts = async (
  user: CreatedUser,
  index: number,
  profile: UserProfile,
): Promise<number[]> => {
  const postIds: number[] = [];
  const offerCount = Math.ceil(POSTS_PER_USER / 2);
  const requestCount = POSTS_PER_USER - offerCount;

  const payloads: {
    title: string;
    description: string;
    category: "OFFER" | "REQUEST";
    serviceMode: "ONLINE" | "OFFLINE";
    assignedTimeCredits: number;
  }[] = [];

  for (let i = 0; i < offerCount; i++) {
    const skills = pickPostSkills(profile, "offer", i + index);
    const skillsText = joinSkills(skills);
    payloads.push({
      title: pick(OFFER_TITLES, i + index).replace("{skills}", skillsText),
      description:
        `${pick(DESCRIPTIONS, i)} ` +
        `المهارات: ${skillsText}. ` +
        `المستخدم: ${profile.name} من ${LOCATION}. ` +
        `يشمل العرض: ${skills.join("، ")}.`,
      category: "OFFER",
      serviceMode: (i + index) % 2 === 0 ? "ONLINE" : "OFFLINE",
      assignedTimeCredits: postCredits(index, i),
    });
  }

  for (let i = 0; i < requestCount; i++) {
    const skills = pickPostSkills(profile, "request", i + index);
    const skillsText = joinSkills(skills);
    payloads.push({
      title: pick(REQUEST_TITLES, i + index).replace("{skills}", skillsText),
      description:
        `${pick(DESCRIPTIONS, i + 1)} ` +
        `أحتاج مساعدة في: ${skillsText}. ` +
        `الموقع: ${LOCATION}. ` +
        `المجالات المطلوبة: ${skills.join("، ")}.`,
      category: "REQUEST",
      serviceMode: (i + index) % 2 === 0 ? "OFFLINE" : "ONLINE",
      assignedTimeCredits: postCredits(index, offerCount + i),
    });
  }

  for (const [postIndex, post] of payloads.entries()) {
    const response = await withRetry(`post ${user.id}#${postIndex}`, () =>
      fetch(`${BASE_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(post),
      }),
    );
    if (!response.ok) {
      const err = (await response.json()) as { message?: string };
      throw new Error(`Post failed: ${err.message ?? response.status}`);
    }
    const created = (await response.json()) as { post: { id: number } };
    postIds.push(created.post.id);
    await sleep(150);
  }

  return postIds;
};

const seedInteractions = async (
  users: CreatedUser[],
  allPostIds: { id: number; ownerId: number }[],
) => {
  let savesOk = 0;
  let appliesOk = 0;

  for (const user of users) {
    const ownPosts = allPostIds.filter((p) => p.ownerId === user.id);
    const othersPosts = allPostIds.filter((p) => p.ownerId !== user.id);
    const providerCandidates = users.filter((candidate) => candidate.id !== user.id);
    if (othersPosts.length === 0 || ownPosts.length === 0 || providerCandidates.length === 0) {
      continue;
    }

    const saveOffset =
      (user.id * 3) % Math.max(othersPosts.length - INTERACTIONS_PER_USER, 1);
    const saveTargets = othersPosts.slice(saveOffset, saveOffset + INTERACTIONS_PER_USER);
    const applyOffset =
      (user.id * 5) % Math.max(ownPosts.length - INTERACTIONS_PER_USER, 1);
    const applyTargets = ownPosts.slice(applyOffset, applyOffset + INTERACTIONS_PER_USER);

    for (let i = 0; i < saveTargets.length; i++) {
      const target = saveTargets[i]!;
      try {
        const response = await withRetry(`save ${user.id}->${target.id}`, () =>
          fetch(`${BASE_URL}/posts/${target.id}/save`, {
            method: "POST",
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        );
        if (response.ok) savesOk++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[gaza-seed] interaction skip: ${msg}`);
      }
      await sleep(250);
    }

    for (let i = 0; i < applyTargets.length; i++) {
      const target = applyTargets[i]!;
      const provider =
        providerCandidates[(user.id + i) % providerCandidates.length]!;
      try {
        const response = await withRetry(`apply ${user.id}->${provider.id}`, () =>
          fetch(`${BASE_URL}/exchanges/request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
            body: JSON.stringify({
              postId: target.id,
              providerId: provider.id,
              duration: 1,
              contractEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          }),
        );
        if (response.ok) appliesOk++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[gaza-seed] interaction skip: ${msg}`);
      }
      await sleep(250);
    }
    await sleep(2_000);
  }

  return { savesOk, appliesOk };
};

const bootstrapAi = async () => {
  const exportResponse = await withRetry("export", () =>
    fetch(`${BASE_URL}/internal/recommender-export`, {
      headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
    }),
  );
  if (!exportResponse.ok) {
    throw new Error(`Export failed: HTTP ${exportResponse.status}`);
  }
  const exportData = await exportResponse.json();
  console.log(
    `[gaza-seed] Export: ${exportData.users.length} users, ${exportData.posts.length} posts, ${exportData.interactions.length} interactions`,
  );

  const bootstrapResponse = await withRetry("bootstrap", () =>
    fetch(`${RECOMMENDER_URL}/sync/bootstrap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": RECOMMENDER_API_KEY,
      },
      body: JSON.stringify(exportData),
    }),
  );
  const bootstrapBody = await bootstrapResponse.json();
  console.log("[gaza-seed] Bootstrap:", JSON.stringify(bootstrapBody));

  const readyResponse = await fetch(`${RECOMMENDER_URL}/ready`);
  const ready = await readyResponse.json();
  console.log("[gaza-seed] AI ready:", JSON.stringify(ready));
};

const main = async () => {
  const dbSkills = await fetchDbSkills();
  const profiles = buildUserProfiles(dbSkills);

  console.log(`[gaza-seed] Run ${RUN_ID} → ${BASE_URL}`);
  console.log(`[gaza-seed] Location: ${LOCATION} | DB skills: ${dbSkills.length}`);
  console.log(
    `[gaza-seed] ${USER_COUNT} users × ${POSTS_PER_USER} posts, ~${INTERACTIONS_PER_USER} interactions/user`,
  );

  const users: CreatedUser[] = [];
  const allPostIds: { id: number; ownerId: number }[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const profile = profiles[i]!;
    const user = await createUser(i, profile);
    users.push(user);
    const postIds = await createPosts(user, i, profile);
    for (const id of postIds) {
      allPostIds.push({ id, ownerId: user.id });
    }
    console.log(
      `[gaza-seed] User ${i + 1}/${USER_COUNT}: id=${user.id}, offer=[${profile.offer.join("، ")}], need=[${profile.need.join("، ")}]`,
    );
    await sleep(300);
  }

  const { savesOk, appliesOk } = await seedInteractions(users, allPostIds);
  console.log(`[gaza-seed] Interactions: ${savesOk} saves, ${appliesOk} applies`);

  await bootstrapAi();

  console.log("\n[gaza-seed] Done.");
  console.log("  Login any seed user with:");
  console.log(`    email: gz_${RUN_ID}_0@seed.wasla.test`);
  console.log(`    password: ${PASSWORD}`);
};

main().catch((err) => {
  console.error("[gaza-seed] Fatal:", err);
  process.exit(1);
});
