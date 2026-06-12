import type { Skill } from "../../generated/prisma/client.js";

export type SkillResponse = {
  id: number;
  name: string;
  category: Skill["category"];
  isApproved: boolean;
};

export const toSkillResponse = (skill: Skill): SkillResponse => ({
  id: skill.id,
  name: skill.name,
  category: skill.category,
  isApproved: skill.isApproved,
});
