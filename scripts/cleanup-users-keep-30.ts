/**
 * Keep only N users; delete the rest.
 *
 * API mode: soft-deletes seed accounts (password SeedPass@123) via DELETE /users/account
 * DB mode: hard-deletes users and related rows (needs production DATABASE_URL)
 *
 *   CONFIRM=yes KEEP_COUNT=30 npm run cleanup:users
 *   CONFIRM=yes SEED_MODE=db DATABASE_URL=... npm run cleanup:users
 */
import "dotenv/config";

const BASE_URL = (process.env.BASE_URL || "https://wasla-backend.up.railway.app").replace(
  /\/$/,
  "",
);
const SEED_MODE = process.env.SEED_MODE || "api";
const KEEP_COUNT = Number(process.env.KEEP_COUNT || 30);
const SEED_RUN_ID = process.env.SEED_RUN_ID || "mqo2h738";
const SEED_PASSWORD = "SeedPass@123";
const RECOMMENDER_API_KEY =
  process.env.RECOMMENDER_API_KEY ||
  "fd793fe2a78a60fce1c137bdf5f171273f2a0a56c91f697bb0c1359da73979f0";
const CONFIRM = process.env.CONFIRM === "yes";

/** Always keep real / high-value test accounts. */
const ALWAYS_KEEP = new Set(
  (process.env.ALWAYS_KEEP_IDS || "11,219")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n)),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchExport = async () => {
  const response = await fetch(`${BASE_URL}/internal/recommender-export`, {
    headers: { "X-Internal-Token": RECOMMENDER_API_KEY },
  });
  if (!response.ok) throw new Error(`Export failed: ${response.status}`);
  return (await response.json()) as {
    users: { user_id: string }[];
    interactions: { user_id: string }[];
  };
};

const buildKeepSet = async (): Promise<Set<number>> => {
  const extra = (process.env.KEEP_USER_IDS || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n));

  if (extra.length >= KEEP_COUNT) {
    return new Set(extra.slice(0, KEEP_COUNT));
  }

  const exportData = await fetchExport();
  const interactionCounts = new Map<number, number>();
  for (const row of exportData.interactions) {
    const id = Number(row.user_id);
    interactionCounts.set(id, (interactionCounts.get(id) || 0) + 1);
  }

  const ranked = exportData.users
    .map((u) => Number(u.user_id))
    .filter((id) => Number.isInteger(id))
    .sort((a, b) => (interactionCounts.get(b) || 0) - (interactionCounts.get(a) || 0));

  const keep = new Set<number>([...ALWAYS_KEEP, ...extra]);
  for (const id of ranked) {
    if (keep.size >= KEEP_COUNT) break;
    keep.add(id);
  }

  return keep;
};

const login = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const raw = await response.text();
  try {
    const body = JSON.parse(raw) as { accessToken?: string; user?: { id: number } };
    if (!response.ok || !body.accessToken || !body.user?.id) return null;
    return { token: body.accessToken, userId: body.user.id };
  } catch {
    return null;
  }
};

const deleteAccountApi = async (token: string, password: string) => {
  const response = await fetch(`${BASE_URL}/users/account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  return response.ok;
};

const runApiMode = async (keep: Set<number>) => {
  console.log(`[cleanup] API soft-delete (seed accounts, run ${SEED_RUN_ID})`);

  let deleted = 0;
  let skipped = 0;
  let kept = 0;
  const failures: string[] = [];

  for (let index = 0; index < 220; index++) {
    const email = `rec_${SEED_RUN_ID}_${index}@seed.wasla.test`;
    const session = await login(email, SEED_PASSWORD);
    if (!session) {
      continue;
    }

    if (keep.has(session.userId)) {
      kept++;
      continue;
    }

    const ok = await deleteAccountApi(session.token, SEED_PASSWORD);
    if (ok) {
      deleted++;
      if (deleted % 20 === 0) console.log(`[cleanup] Deleted ${deleted} seed accounts...`);
    } else {
      failures.push(`user ${session.userId} (${email})`);
    }

    await sleep(150);
  }

  console.log(`[cleanup] API done: deleted=${deleted}, kept=${kept}, failures=${failures.length}`);
  if (failures.length) failures.slice(0, 5).forEach((f) => console.log(`  - ${f}`));
};

const hardDeleteUsers = async (userIds: number[]) => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for SEED_MODE=db");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log(`[cleanup] DB hard-delete ${userIds.length} users...`);

  for (const userId of userIds) {
    await prisma.$transaction(async (tx) => {
      const reviewExchangeIds = (
        await tx.review.findMany({
          where: { OR: [{ reviewer_id: userId }, { reviewee_id: userId }] },
          select: { service_exchange_id: true },
        })
      ).map((r) => r.service_exchange_id);

      await tx.review.deleteMany({
        where: { OR: [{ reviewer_id: userId }, { reviewee_id: userId }] },
      });

      await tx.serviceExchange.deleteMany({
        where: {
          OR: [
            { provider_id: userId },
            { consumer_id: userId },
            { id: { in: reviewExchangeIds } },
          ],
        },
      });

      await tx.transaction.deleteMany({
        where: { OR: [{ receiver_id: userId }, { sender_id: userId }] },
      });

      const conversationIds = (
        await tx.conversationParticipant.findMany({
          where: { userId },
          select: { conversationId: true },
        })
      ).map((c) => c.conversationId);

      if (conversationIds.length) {
        await tx.messageReadReceipt.deleteMany({
          where: { message: { conversationId: { in: conversationIds } } },
        });
        await tx.message.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
        await tx.conversationParticipant.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
        await tx.conversation.deleteMany({
          where: { id: { in: conversationIds } },
        });
      }

      await tx.notification.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { user_id: userId } });
      await tx.savedPost.deleteMany({ where: { user_id: userId } });
      await tx.post.deleteMany({ where: { user_id: userId } });
      await tx.userSkill.deleteMany({ where: { user_id: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    if (userId % 20 === 0) console.log(`[cleanup] Hard-deleted through user ${userId}...`);
  }

  await prisma.$disconnect();
  console.log(`[cleanup] DB hard-delete complete (${userIds.length} users)`);
};

const runDbMode = async (keep: Set<number>) => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for SEED_MODE=db");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const allUsers = await prisma.user.findMany({
    where: { deleted_at: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  await prisma.$disconnect();

  const toDelete = allUsers.map((u) => u.id).filter((id) => !keep.has(id));
  console.log(`[cleanup] Keeping ${keep.size} users: ${[...keep].sort((a, b) => a - b).join(", ")}`);
  console.log(`[cleanup] Will delete ${toDelete.length} users`);

  await hardDeleteUsers(toDelete);
};

const main = async () => {
  if (!CONFIRM) {
    console.error("[cleanup] Refusing to run without CONFIRM=yes");
    process.exit(1);
  }

  const keep = await buildKeepSet();
  console.log(`[cleanup] Keep ${keep.size} users: ${[...keep].sort((a, b) => a - b).join(", ")}`);

  if (SEED_MODE === "db") {
    await runDbMode(keep);
  } else if (SEED_MODE === "both") {
    await runApiMode(keep);
    await runDbMode(keep);
  } else {
    await runApiMode(keep);
    const after = await fetchExport();
    console.log(`[cleanup] Users remaining in export: ${after.users.length}`);
    console.log(
      "[cleanup] Note: API mode only removes seed accounts. For full cleanup of all non-kept users, run with SEED_MODE=db and production DATABASE_URL.",
    );
  }
};

main().catch((err) => {
  console.error("[cleanup] Fatal:", err);
  process.exit(1);
});
