import { z } from "zod";
import { userSkillsArraySchema } from "../skills/skills.schema.js";

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(
        /^[a-zA-Z\u0600-\u06FF\s]+$/,
        "Name must contain letters only",
      )
      .optional(),
    bio: z.string().trim().max(500).optional().nullable(),
    profilePicture: z.string().url().optional().nullable(),
    offeredSkills: userSkillsArraySchema.optional(),
    requiredSkills: userSkillsArraySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
