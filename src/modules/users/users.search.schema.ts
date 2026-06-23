import { z } from "zod";

export const searchUsersSchema = z.object({
  query: z.string().trim().min(1).max(500),
  topK: z.number().int().min(1).max(50).optional().default(20),
});

export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
