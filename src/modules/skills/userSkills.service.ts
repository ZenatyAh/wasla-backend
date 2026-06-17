import { prisma } from "../../lib/prisma.js";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

export const syncUserSkillsByType = async (
  tx: TransactionClient,
  userId: number,
  skillNames: string[],
  skillType: "OFFER" | "REQUEST",
) => {
  for (const skillName of skillNames) {
    const skill = await tx.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName, category: "GENERAL" },
    });

    await tx.userSkill.upsert({
      where: {
        user_id_skill_id_skill_type: {
          user_id: userId,
          skill_id: skill.id,
          skill_type: skillType,
        },
      },
      update: {},
      create: {
        user_id: userId,
        skill_id: skill.id,
        skill_type: skillType,
      },
    });
  }

  await tx.userSkill.deleteMany({
    where: {
      user_id: userId,
      skill_type: skillType,
      skill: {
        name: { notIn: skillNames },
      },
    },
  });
};
