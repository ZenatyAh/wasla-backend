import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { SkillError } from "./skills.errors.js";
import { toSkillResponse } from "./skills.mapper.js";
import type { CreateSkillInput, ListSkillsQuery } from "./skills.schema.js";

export const listSkills = async (query: ListSkillsQuery) => {
  const skills = await prisma.skill.findMany({
    where: {
      isApproved: true,
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: { name: "asc" },
  });

  return skills.map(toSkillResponse);
};

export const createSkill = async (data: CreateSkillInput) => {
  const name = data.name.trim();

  const existing = await prisma.skill.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
  });

  if (existing) {
    throw new SkillError("Skill already exists", 409);
  }

  try {
    const skill = await prisma.skill.create({
      data: {
        name,
        category: data.category,
      },
    });

    return toSkillResponse(skill);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new SkillError("Skill already exists", 409);
    }
    throw err;
  }
};
