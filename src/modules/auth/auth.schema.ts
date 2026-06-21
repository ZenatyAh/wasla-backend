import { z } from "zod";
import { userSkillsArraySchema } from "../skills/skills.schema.js";

export const emailSchema = z.string().trim().email("Invalid email format");
export const passwordSchema = z
  .string()
  .min(8, "Password is too short")
  .max(50, "Password is too long")
  .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
  .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
  .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل")
  .regex(/[^A-Za-z0-9]/, "يجب أن تحتوي على رمز خاص واحد على الأقل (@#$...)");

export const loginschema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-zA-Z\u0600-\u06FF\s]+$/,
      "الاسم يجب أن يحتوي على حروف فقط وبدون أرقام",
    ),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(
      /^(?=(.*[a-zA-Z]){3,})[a-zA-Z0-9\d\W_]+$/,
      "يجب أن يحتوي اسم المستخدم على 3 حروف إنجليزية على الأقل، ويمكنك استخدام الأرقام والرموز",
    ),
  email: emailSchema,
  password: passwordSchema,
  bio: z.string().min(50).max(200).optional().or(z.literal("")), // يقبل اختياري أو نص فارغ
  profile_image: z.string().url().optional(),
  location: z.string().min(3, "choose correct city name").optional(),
  offeredSkills: userSkillsArraySchema,
  requiredSkills: userSkillsArraySchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginschema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
