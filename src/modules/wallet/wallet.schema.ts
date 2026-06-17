import { z } from "zod";

export const walletTransactionTypeSchema = z.enum([
  "earned",
  "spent",
  "credit",
  "debit",
]);

export const walletTransactionStatusSchema = z.enum([
  "completed",
  "pending",
  "cancelled",
]);

export const listWalletHistoryQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    type: walletTransactionTypeSchema.optional(),
    status: walletTransactionStatusSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((query) => !query.startDate || !query.endDate || query.startDate <= query.endDate, {
    message: "startDate must be before or equal to endDate",
    path: ["startDate"],
  });

export type ListWalletHistoryQuery = z.infer<typeof listWalletHistoryQuerySchema>;

export type NormalizedWalletType = "credit" | "debit";

export const normalizeWalletType = (
  type?: z.infer<typeof walletTransactionTypeSchema>,
): NormalizedWalletType | undefined => {
  if (!type) {
    return undefined;
  }
  if (type === "earned" || type === "credit") {
    return "credit";
  }
  return "debit";
};
