import { z } from "zod";

const emailSchema = z.string().email("Invalid email format");
const passwordSchema = z
  .string()
  .min(8, "Password is too short")
  .max(50, "Password is too long");
const skillsArray = z
  .array(z.string().min(2))
  .min(5)
  .max(10)
  .refine((items) => new Set(items).size === items.length, {
    message: "Array contains duplicate values; each item must be unique",
  });

export const loginschema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  full_name: z.string().min(15).max(40),
  username: z.string().min(5).max(15),
  email: emailSchema,
  password: passwordSchema,
  bio: z.string().min(50).max(200).optional().or(z.literal("")), // يقبل اختياري أو نص فارغ
  profile_image: z.string().url().optional(),
  location: z.string().optional(),
  offeredSkills: skillsArray,
  requiredSkills: skillsArray,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginschema>;
