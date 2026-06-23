import { z } from "zod";

export const searchUsersFiltersSchema = z.object({
  skillType: z.enum(["OFFER", "REQUEST"]).optional(),
  location: z.string().trim().min(1).optional(),
  isOnline: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const searchUsersSchema = z.object({
  query: z.string().trim().min(1).max(500),
  topK: z.number().int().min(1).max(50).optional().default(20),
  filters: searchUsersFiltersSchema.optional(),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;

