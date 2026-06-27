/**
 * Delete all service exchanges (contracts) linked to a username.
 * Uses raw SQL so it works even when production DB is behind local migrations.
 *
 * Run:
 *   DATABASE_URL=... npx tsx scripts/delete-nada1-contracts.ts nada1
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const USERNAME = (process.argv[2] ?? "nada1").trim();

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function runSql(label: string, sql: string): Promise<number> {
  try {
    const count = await prisma.$executeRawUnsafe(sql);
    const deleted = Number(count);
    console.log(`  ${label}: ${deleted}`);
    return deleted;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("does not exist")) {
      console.log(`  ${label}: skipped (${message})`);
      return 0;
    }
    console.error(`  ${label}: FAILED — ${message}`);
    throw err;
  }
}

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      username: { equals: USERNAME, mode: "insensitive" },
    },
    select: { id: true, username: true, full_name: true },
  });

  if (!user) {
    console.log(`User "${USERNAME}" not found.`);
    return;
  }

  const exchanges = await prisma.serviceExchange.findMany({
    where: {
      OR: [{ provider_id: user.id }, { consumer_id: user.id }],
    },
    select: { id: true, status: true, escrow_status: true, time_credits: true },
    orderBy: { id: "asc" },
  });

  if (exchanges.length === 0) {
    console.log(`No contracts found for ${USERNAME} (user id ${user.id}).`);
    return;
  }

  console.log(`Found ${exchanges.length} contract(s) for ${USERNAME}:`);
  for (const ex of exchanges) {
    console.log(
      `  #${ex.id} status=${ex.status} escrow=${ex.escrow_status} credits=${ex.time_credits}`,
    );
  }

  const ids = exchanges.map((ex) => ex.id);
  const idList = ids.join(",");

  console.log("\nDeleting...");

  await runSql(
    "notifications",
    `DELETE FROM notifications
     WHERE (data->>'contractId') ~ '^[0-9]+$'
       AND (data->>'contractId')::int IN (${idList})`,
  );

  await runSql(
    "transactions",
    `DELETE FROM transactions WHERE reference_contract_id IN (${idList})`,
  );

  if (await tableExists("work_sessions")) {
    await runSql(
      "work_sessions",
      `DELETE FROM work_sessions WHERE contract_id IN (${idList})`,
    );
  } else {
    console.log("  work_sessions: skipped (table not deployed)");
  }

  if (await tableExists("reviews")) {
    await runSql(
      "reviews",
      `DELETE FROM reviews WHERE service_exchange_id IN (${idList})`,
    );
  } else {
    console.log("  reviews: skipped (table not deployed)");
  }

  await runSql(
    "service_exchanges",
    `DELETE FROM service_exchanges WHERE id IN (${idList})`,
  );

  const remaining = await prisma.serviceExchange.count({
    where: { id: { in: ids } },
  });

  console.log(`\nRemaining matching contracts: ${remaining}`);
  console.log(remaining === 0 ? "Done." : "Some contracts could not be deleted.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
