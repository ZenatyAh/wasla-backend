import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEED_SKILLS = [
  { name: "Translation", category: "GENERAL" as const },
  { name: "Tutoring", category: "GENERAL" as const },
  { name: "Home Maintenance", category: "GENERAL" as const },
  { name: "Web Development", category: "TECHNICAL" as const },
  { name: "Mobile Apps", category: "TECHNICAL" as const },
  { name: "UI/UX", category: "TECHNICAL" as const },
];

async function main() {
  for (const skill of SEED_SKILLS) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { category: skill.category },
      create: skill,
    });
  }

  console.log(`Seeded ${SEED_SKILLS.length} skills`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
