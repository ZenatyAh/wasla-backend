import { z } from "zod";
import {
  DATE_ONLY_CONTRACT_END,
  parseContractEndDate,
} from "../../common/utils/contractDeadline.js";

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

const contractEndDateField = (label: string) =>
  z
    .string()
    .regex(DATE_ONLY_CONTRACT_END, `${label} must be YYYY-MM-DD`)
    .transform(parseContractEndDate)
    .refine((val) => val > new Date(), {
      message: `${label} must be in the future`,
    });

export const createExchangeSchema = z.preprocess(
  (data) => {
    if (
      data &&
      typeof data === "object" &&
      "maximumEndDate" in data &&
      !("contractEndDate" in data)
    ) {
      const { maximumEndDate, ...rest } = data as Record<string, unknown>;
      return { ...rest, contractEndDate: maximumEndDate };
    }
    return data;
  },
  z.object({
    postId: z.coerce.number().int().positive(),
    providerId: z.coerce.number().int().positive(),
    duration: z.coerce.number().int().positive().max(100000),
    contractEndDate: contractEndDateField("Contract end date"),
  }),
);

export const listExchangesQuerySchema = z.object({
  role: z.enum(["provider", "requester"]).optional(),
  status: exchangeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const exchangeIdParamSchema = z.coerce.number().int().positive();

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>;
export type ListExchangesQuery = z.infer<typeof listExchangesQuerySchema>;

export const createSessionSchema = z.object({
  hours: z.coerce.number().int().positive().max(100000),
  notes: z.string().optional(),
});

export const sessionIdParamSchema = z.coerce.number().int().positive();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const deadlineExtensionSchema = z.object({
  proposedEndDate: contractEndDateField("Proposed end date"),
});
export type DeadlineExtensionInput = z.infer<typeof deadlineExtensionSchema>;
