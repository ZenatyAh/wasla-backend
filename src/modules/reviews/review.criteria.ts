import type { Prisma } from "../../generated/prisma/client.js";

export const reviewableExchangeWhere: Prisma.ServiceExchangeWhereInput = {
  OR: [
    { status: "COMPLETED" },
    { status: "DISPUTED", escrow_status: { not: "HELD" } },
  ],
};

export const isExchangeReviewable = (exchange: {
  status: string;
  escrow_status: string;
}) =>
  exchange.status === "COMPLETED" ||
  (exchange.status === "DISPUTED" && exchange.escrow_status !== "HELD");

export const getRevieweeId = (
  exchange: { provider_id: number; consumer_id: number },
  reviewerId: number,
) =>
  exchange.provider_id === reviewerId
    ? exchange.consumer_id
    : exchange.provider_id;
