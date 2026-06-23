/**
 * Seeds users + posts for recommender testing.
 *
 * API mode (default): hits the live backend so syncPost/syncUser fire automatically.
 *   BASE_URL=https://wasla-backend.up.railway.app npx tsx scripts/seed-recommender-dataset.ts
 *
 * DB mode: writes directly via Prisma (faster; set DATABASE_URL to production).
 *   SEED_MODE=db npx tsx scripts/seed-recommender-dataset.ts
 */
import "dotenv/config";
import bcrypt from "bcrypt";

const USER_COUNT = Number(process.env.SEED_USER_COUNT || 200);
const POSTS_PER_USER = Number(process.env.SEED_POSTS_PER_USER || 10);
const BASE_URL = (process.env.BASE_URL || "https://wasla-backend.up.railway.app").replace(
  /\/$/,
  "",
);
const SEED_MODE = process.env.SEED_MODE || "api";
const PASSWORD = "SeedPass@123";
const RUN_ID = process.env.SEED_RUN_ID || Date.now().toString(36);

const LOCATIONS = [
  "Cairo",
  "Riyadh",
  "Dubai",
  "Amman",
  "Beirut",
  "Jeddah",
  "Alexandria",
  "Casablanca",
  "Doha",
  "Kuwait City",
];

/** 20 skill profiles × 10 users each = 200 users with varied offer/need pairs. */
const SKILL_PROFILES: { offer: string[]; need: string[] }[] = [
  { offer: ["JavaScript", "React"], need: ["Python", "UI/UX"] },
  { offer: ["Python", "Data Analysis"], need: ["JavaScript", "Docker"] },
  { offer: ["Web Development", "WordPress"], need: ["Graphic Design", "SEO"] },
  { offer: ["Mobile Apps", "Flutter"], need: ["UI/UX", "Marketing"] },
  { offer: ["UI/UX", "Figma"], need: ["Web Development", "React"] },
  { offer: ["Graphic Design", "Photography"], need: ["Video Editing", "Marketing"] },
  { offer: ["Translation", "Arabic Writing"], need: ["English Teaching", "Tutoring"] },
  { offer: ["Tutoring", "Mathematics"], need: ["Physics", "Chemistry"] },
  { offer: ["Home Maintenance", "Plumbing"], need: ["Electrical Work", "Carpentry"] },
  { offer: ["Marketing", "SEO"], need: ["Content Writing", "Social Media"] },
  { offer: ["Video Editing", "After Effects"], need: ["Photography", "Graphic Design"] },
  { offer: ["Node.js", "Express"], need: ["PostgreSQL", "Docker"] },
  { offer: ["Docker", "DevOps"], need: ["AWS", "Kubernetes"] },
  { offer: ["Content Writing", "Copywriting"], need: ["SEO", "Marketing"] },
  { offer: ["English Teaching", "IELTS Prep"], need: ["Translation", "Tutoring"] },
  { offer: ["Accounting", "Excel"], need: ["Financial Planning", "Bookkeeping"] },
  { offer: ["Carpentry", "Furniture Making"], need: ["Interior Design", "Painting"] },
  { offer: ["Social Media", "Instagram Growth"], need: ["Photography", "Video Editing"] },
  { offer: ["Machine Learning", "Python"], need: ["Statistics", "Data Analysis"] },
  { offer: ["Interior Design", "3D Modeling"], need: ["Carpentry", "Home Maintenance"] },
];

const OFFER_TITLES: Record<string, string[]> = {
  JavaScript: ["JS tutoring sessions", "Frontend bug fixes", "React component help"],
  Python: ["Python automation scripts", "Django API help", "Data scraping service"],
  "Web Development": ["Build your landing page", "Full-stack web project", "Website maintenance"],
  WordPress: ["WordPress theme setup", "Plugin customization", "WP site migration"],
  "Mobile Apps": ["Android app prototype", "Cross-platform mobile app", "App store deployment"],
  Flutter: ["Flutter UI implementation", "Mobile app MVP", "Flutter bug fixes"],
  "UI/UX": ["UX audit for your app", "Wireframes and prototypes", "Design system setup"],
  Figma: ["Figma to code handoff", "Interactive Figma prototypes", "Design file cleanup"],
  "Graphic Design": ["Logo design package", "Social media graphics", "Brand identity kit"],
  Photography: ["Product photography session", "Portrait photo shoot", "Event photography"],
  Translation: ["Arabic to English translation", "Document translation service", "Subtitle translation"],
  "Arabic Writing": ["Arabic blog articles", "Marketing copy in Arabic", "Proofreading Arabic text"],
  Tutoring: ["One-on-one tutoring", "Exam prep sessions", "Homework help online"],
  Mathematics: ["Math tutoring for students", "Calculus problem solving", "Statistics tutoring"],
  "Home Maintenance": ["Home repair visit", "Appliance installation", "General handyman service"],
  Plumbing: ["Plumbing repair service", "Pipe leak fix", "Bathroom fixture install"],
  Marketing: ["Marketing strategy session", "Campaign planning help", "Growth marketing audit"],
  SEO: ["SEO site audit", "Keyword research package", "On-page SEO optimization"],
  "Video Editing": ["YouTube video editing", "Short-form reel editing", "Promo video production"],
  "After Effects": ["Motion graphics intro", "Animated explainer clip", "AE template customization"],
  "Node.js": ["Node API development", "Express backend setup", "Node performance tuning"],
  Express: ["REST API with Express", "Middleware debugging", "Express auth integration"],
  Docker: ["Dockerize your app", "Docker Compose setup", "Container troubleshooting"],
  DevOps: ["CI/CD pipeline setup", "Deployment automation", "Infrastructure review"],
  "Content Writing": ["Blog post writing", "Website copywriting", "Newsletter content"],
  Copywriting: ["Sales page copy", "Ad copywriting", "Email sequence writing"],
  "English Teaching": ["English conversation practice", "Business English lessons", "Grammar coaching"],
  "IELTS Prep": ["IELTS speaking prep", "IELTS writing feedback", "IELTS mock tests"],
  Accounting: ["Bookkeeping assistance", "Financial report help", "Tax prep support"],
  Excel: ["Excel dashboard build", "Spreadsheet automation", "Excel formula tutoring"],
  Carpentry: ["Custom shelf build", "Furniture repair", "Woodworking project"],
  "Furniture Making": ["Custom table build", "Cabinet installation", "Furniture restoration"],
  "Social Media": ["Social media management", "Content calendar setup", "Community engagement"],
  "Instagram Growth": ["Instagram strategy call", "Reels content plan", "Profile optimization"],
  "Machine Learning": ["ML model prototyping", "Dataset cleaning help", "Model evaluation review"],
  "Interior Design": ["Room layout planning", "Color palette consultation", "Small space design"],
  "3D Modeling": ["3D product renders", "Architectural visualization", "Blender modeling help"],
  React: ["React app debugging", "React hooks tutoring", "Component library setup"],
  "Data Analysis": ["Excel data analysis", "Python pandas report", "Dashboard insights"],
  default: ["Professional service offer", "Skilled help available", "Quality service delivery"],
};

const REQUEST_TITLES: Record<string, string[]> = {
  Python: ["Need Python developer help", "Looking for Python tutor", "Python script assistance"],
  "UI/UX": ["Need UX review for app", "Looking for UI designer", "Help with user flows"],
  JavaScript: ["Need JS mentor", "Frontend help needed", "JavaScript debugging help"],
  Docker: ["Help dockerizing project", "Need DevOps with Docker", "Container setup help"],
  "Graphic Design": ["Need logo designer", "Looking for graphic artist", "Design help needed"],
  SEO: ["Need SEO specialist", "Website ranking help", "SEO audit wanted"],
  "Web Development": ["Need website built", "Looking for web developer", "Site rebuild help"],
  React: ["Need React developer", "React project assistance", "Help migrating to React"],
  Marketing: ["Need marketing advice", "Campaign help wanted", "Growth strategy needed"],
  "Mobile Apps": ["Need mobile app built", "App development help", "Looking for app developer"],
  "Video Editing": ["Need video editor", "YouTube editing help", "Promo video needed"],
  "English Teaching": ["Need English tutor", "Conversation partner wanted", "English lessons needed"],
  Tutoring: ["Need private tutor", "Exam prep help wanted", "Subject tutoring needed"],
  "Electrical Work": ["Need electrician visit", "Wiring repair help", "Electrical install needed"],
  Carpentry: ["Need carpenter for shelves", "Furniture fix needed", "Woodwork help wanted"],
  "Content Writing": ["Need blog writer", "Website copy needed", "Content creator wanted"],
  "Social Media": ["Need social media help", "Instagram manager wanted", "Content posting help"],
  PostgreSQL: ["Need database help", "PostgreSQL tuning wanted", "SQL query assistance"],
  AWS: ["Need AWS setup help", "Cloud deployment assistance", "AWS cost review wanted"],
  "Financial Planning": ["Need budget planning help", "Personal finance advice", "Financial review wanted"],
  Bookkeeping: ["Need bookkeeping help", "Accounts cleanup wanted", "Invoice tracking help"],
  "Interior Design": ["Need room redesign", "Interior advice wanted", "Home styling help"],
  Painting: ["Need room painted", "Wall painting help", "Home paint job wanted"],
  Photography: ["Need product photos", "Portrait session wanted", "Event photographer needed"],
  Statistics: ["Need stats tutoring", "Data interpretation help", "Statistics project help"],
  "Data Analysis": ["Need data insights", "Analytics report wanted", "Dataset analysis help"],
  "Home Maintenance": ["Need handyman visit", "Home repair help", "Maintenance service wanted"],
  Physics: ["Need physics tutor", "Physics homework help", "Exam prep for physics"],
  Chemistry: ["Need chemistry tutor", "Lab report help", "Chemistry exam prep"],
  Kubernetes: ["Need K8s setup help", "Cluster troubleshooting", "Kubernetes migration help"],
  default: ["Looking for skilled helper", "Need professional assistance", "Service request posted"],
};

const letterName = (index: number): string => {
  const part = (n: number) => String.fromCharCode(65 + (n % 26));
  return `Wasla Tester ${part(index)}${part(Math.floor(index / 26))}${part(Math.floor(index / 676))}`;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetry = async <T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await sleep(500 * (i + 1));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
};

const pick = <T>(arr: T[], index: number): T => arr[index % arr.length]!;

const titleForSkill = (
  skill: string,
  kind: "offer" | "request",
  variant: number,
): string => {
  const map = kind === "offer" ? OFFER_TITLES : REQUEST_TITLES;
  const options = map[skill] ?? map.default!;
  return `${pick(options, variant)} — ${skill}`;
};

const descriptionFor = (skill: string, kind: "offer" | "request", userIndex: number) => {
  const action = kind === "offer" ? "I can help with" : "I am looking for help with";
  return `${action} ${skill}. Seed dataset user #${userIndex + 1}, run ${RUN_ID}. Detailed enough for recommender testing.`;
};

type CreatedUser = { id: number; email: string; token?: string };

const createUserViaApi = async (index: number): Promise<CreatedUser> => {
  const profile = pick(SKILL_PROFILES, index);
  const email = `rec_${RUN_ID}_${index}@seed.wasla.test`;
  const username = `rec${RUN_ID}${index}`.slice(0, 50);
  const location = pick(LOCATIONS, index);

  const response = await withRetry(`register ${email}`, () =>
    fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: letterName(index),
        username,
        email,
        password: PASSWORD,
        location,
        offeredSkills: profile.offer,
        requiredSkills: profile.need,
      }),
    }),
  );

  const body = (await response.json()) as {
    accessToken?: string;
    user?: { id: number };
    id?: number;
    message?: string;
    errors?: { path?: string; message?: string }[];
  };

  if (!response.ok) {
    const detail =
      "errors" in body && Array.isArray(body.errors)
        ? body.errors.map((e: { path?: string; message?: string }) => `${e.path}: ${e.message}`).join("; ")
        : body.message ?? String(response.status);
    throw new Error(`Register failed for ${email}: ${detail}`);
  }

  const userId = body.user?.id ?? body.id;
  const token = body.accessToken;
  if (!userId || !token) {
    throw new Error(`Register missing token/id for ${email}`);
  }

  return { id: userId, email, token };
};

const createPostsViaApi = async (user: CreatedUser, index: number) => {
  const profile = pick(SKILL_PROFILES, index);
  const posts: {
    title: string;
    description: string;
    category: "OFFER" | "REQUEST";
    serviceMode: "ONLINE" | "OFFLINE";
    assignedTimeCredits: number;
  }[] = [];

  const offerCount = Math.ceil(POSTS_PER_USER / 2);
  const requestCount = POSTS_PER_USER - offerCount;

  for (let i = 0; i < offerCount; i++) {
    const skill = pick(profile.offer, i);
    posts.push({
      title: titleForSkill(skill, "offer", i + index),
      description: descriptionFor(skill, "offer", index),
      category: "OFFER",
      serviceMode: (i + index) % 2 === 0 ? "ONLINE" : "OFFLINE",
      assignedTimeCredits: 10 + ((index + i) % 40),
    });
  }

  for (let i = 0; i < requestCount; i++) {
    const skill = pick(profile.need, i);
    posts.push({
      title: titleForSkill(skill, "request", i + index),
      description: descriptionFor(skill, "request", index),
      category: "REQUEST",
      serviceMode: (i + index) % 2 === 0 ? "OFFLINE" : "ONLINE",
      assignedTimeCredits: 5 + ((index + i) % 30),
    });
  }

  const results = await Promise.all(
    posts.map(async (post, postIndex) => {
      const response = await withRetry(`post for user ${user.id} #${postIndex}`, () =>
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
        throw new Error(`Post failed for user ${user.id}: ${err.message ?? response.status}`);
      }
      return response.json();
    }),
  );

  return results.length;
};

const runApiMode = async () => {
  console.log(`[seed] API mode → ${BASE_URL}`);
  console.log(`[seed] Creating ${USER_COUNT} users × ${POSTS_PER_USER} posts (run ${RUN_ID})`);

  let usersOk = 0;
  let postsOk = 0;
  const failures: string[] = [];
  const CONCURRENCY = 2;

  for (let batch = 0; batch < USER_COUNT; batch += CONCURRENCY) {
    const indices = Array.from(
      { length: Math.min(CONCURRENCY, USER_COUNT - batch) },
      (_, j) => batch + j,
    );

    await Promise.all(
      indices.map(async (index) => {
        try {
          const user = await createUserViaApi(index);
          usersOk++;
          const count = await createPostsViaApi(user, index);
          postsOk += count;
          if ((index + 1) % 10 === 0 || index === USER_COUNT - 1) {
            console.log(`[seed] Progress: ${index + 1}/${USER_COUNT} users, ${postsOk} posts`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push(`user#${index + 1}: ${msg}`);
          console.error(`[seed] FAIL user#${index + 1}: ${msg}`);
        }
      }),
    );

    await sleep(500);
  }

  console.log("\n[seed] Done.");
  console.log(`  Users created: ${usersOk}/${USER_COUNT}`);
  console.log(`  Posts created: ${postsOk}/${USER_COUNT * POSTS_PER_USER}`);
  console.log(`  Failures: ${failures.length}`);
  if (failures.length) {
    console.log("  First 5 failures:");
    failures.slice(0, 5).forEach((f) => console.log(`    - ${f}`));
  }
};

const runDbMode = async () => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { syncPost, syncUser } = await import("../src/modules/recommender/recommender.client.js");
  const { syncUserSkillsByType } = await import("../src/modules/skills/userSkills.service.js");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for SEED_MODE=db");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  console.log(`[seed] DB mode → ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`[seed] Creating ${USER_COUNT} users × ${POSTS_PER_USER} posts (run ${RUN_ID})`);

  let usersOk = 0;
  let postsOk = 0;

  for (let index = 0; index < USER_COUNT; index++) {
    const profile = pick(SKILL_PROFILES, index);
    const email = `rec_${RUN_ID}_${index}@seed.wasla.test`;
    const username = `rec${RUN_ID}${index}`.slice(0, 50);
    const location = pick(LOCATIONS, index);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          full_name: letterName(index),
          username,
          email,
          password_hash: passwordHash,
          location,
        },
      });

      await syncUserSkillsByType(tx, created.id, profile.offer, "OFFER");
      await syncUserSkillsByType(tx, created.id, profile.need, "REQUEST");

      await tx.transaction.create({
        data: {
          receiver_id: created.id,
          sender_id: null,
          amount: 5,
          transaction_type: "WELCOME_BONUS",
        },
      });

      return created;
    });

    usersOk++;
    syncUser(user.id);

    const offerCount = Math.ceil(POSTS_PER_USER / 2);
    const requestCount = POSTS_PER_USER - offerCount;

    for (let i = 0; i < offerCount; i++) {
      const skill = pick(profile.offer, i);
      const post = await prisma.post.create({
        data: {
          user_id: user.id,
          title: titleForSkill(skill, "offer", i + index),
          description: descriptionFor(skill, "offer", index),
          category: "OFFER",
          service_mode: (i + index) % 2 === 0 ? "ONLINE" : "OFFLINE",
          assigned_time_credits: 10 + ((index + i) % 40),
          status: "PUBLISHED",
        },
      });
      postsOk++;
      syncPost(post.id);
    }

    for (let i = 0; i < requestCount; i++) {
      const skill = pick(profile.need, i);
      const post = await prisma.post.create({
        data: {
          user_id: user.id,
          title: titleForSkill(skill, "request", i + index),
          description: descriptionFor(skill, "request", index),
          category: "REQUEST",
          service_mode: (i + index) % 2 === 0 ? "OFFLINE" : "ONLINE",
          assigned_time_credits: 5 + ((index + i) % 30),
          status: "PUBLISHED",
        },
      });
      postsOk++;
      syncPost(post.id);
    }

    if ((index + 1) % 20 === 0 || index === USER_COUNT - 1) {
      console.log(`[seed] Progress: ${index + 1}/${USER_COUNT} users, ${postsOk} posts`);
    }
  }

  await prisma.$disconnect();
  console.log("\n[seed] Done.");
  console.log(`  Users created: ${usersOk}/${USER_COUNT}`);
  console.log(`  Posts created: ${postsOk}/${USER_COUNT * POSTS_PER_USER}`);
};

const main = async () => {
  if (SEED_MODE === "db") {
    await runDbMode();
  } else {
    await runApiMode();
  }
};

main().catch((err) => {
  console.error("[seed] Fatal:", err);
  process.exit(1);
});
