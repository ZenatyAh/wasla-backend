import { z } from "zod";

export const skillCategorySchema = z.enum(["TECHNICAL", "GENERAL"]);

export const listSkillsQuerySchema = z.object({
  category: skillCategorySchema.optional(),
});

export const createSkillSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: skillCategorySchema,
});

export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>;
export type CreateSkillInput = z.infer<typeof createSkillSchema>;
