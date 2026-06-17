import { z } from "zod";

export const userSkillsArraySchema = z
  .array(z.string().min(2))
  .min(1)
  .max(10)
  .refine((items) => new Set(items).size === items.length, {
    message: "Array contains duplicate values; each item must be unique",
  });

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
