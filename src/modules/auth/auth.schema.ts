import { email, z } from "zod";

export const loginschema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password is too short")
    .max(50, "Password is too long"),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(15, "Full name must be at least 15 characters")
    .max(40, "Full name must not exceed 40 characters"),

  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(15, "Username must not exceed 15 characters"),

  email: z.string().email("Invalid email format"),

  password: z
    .string()
    .min(8, "Password is too short")
    .max(50, "Password is too long"),

  bio: z
    .string()
    .min(50, "Bio must be at least 50 characters")
    .max(200)
    .optional(),

  profile_image: z.string().url("Invalid image URL").optional(),

  location: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginschema>;
