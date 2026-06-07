import { z } from "zod";

export const exchangeStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING_CONFIRMATION",
  "COMPLETED",
  "CANCELED",
  "REJECTED",
  "DISPUTED",
]);

export const createExchangeSchema = z.object({
  postId: z.coerce.number().int().positive(),
  providerId: z.coerce.number().int().positive(),
  duration: z.coerce.number().int().positive().max(100000),
});

export const listExchangesQuerySchema = z.object({
  role: z.enum(["provider", "requester"]).optional(),
  status: exchangeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const exchangeIdParamSchema = z.coerce.number().int().positive();

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type ListExchangesQuery = z.infer<typeof listExchangesQuerySchema>;
