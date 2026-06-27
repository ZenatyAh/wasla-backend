/**
 * Watch notifications in the database for demo or specific users.
 *
 *   npx tsx scripts/watch-notifications.ts
 *   USER_IDS=128,129 npx tsx scripts/watch-notifications.ts
 *   CONTRACT_ID=88 npx tsx scripts/watch-notifications.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const userIds = (process.env.USER_IDS ?? "128,129")
  .split(",")
  .map((id) => Number(id.trim()))
  .filter((id) => Number.isInteger(id) && id > 0);

const contractId = process.env.CONTRACT_ID
  ? Number(process.env.CONTRACT_ID)
  : undefined;

const main = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: { in: userIds },
      ...(contractId
        ? {
            data: {
              path: ["contractId"],
              equals: contractId,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: { id: true, email: true, full_name: true },
      },
    },
  });

  console.log(`\nNotifications (${notifications.length} rows)`);
  console.log(`Users: ${userIds.join(", ")}`);
  if (contractId) console.log(`Contract filter: ${contractId}`);
  console.log("—".repeat(60));

  if (notifications.length === 0) {
    console.log("No notifications found.");
  } else {
    for (const n of notifications) {
      console.log(
        JSON.stringify(
          {
            id: n.id,
            userId: n.userId,
            userEmail: n.user.email,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            isRead: n.isRead,
            createdAt: n.createdAt,
          },
          null,
          2,
        ),
      );
      console.log("—".repeat(60));
    }
  }

  const contract = contractId
    ? await prisma.serviceExchange.findUnique({
        where: { id: contractId },
        select: {
          id: true,
          status: true,
          provider_id: true,
          consumer_id: true,
          maximum_end_date: true,
          proposed_end_date: true,
        },
      })
    : null;

  if (contract) {
    console.log("\nContract:");
    console.log(JSON.stringify(contract, null, 2));
  }
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
