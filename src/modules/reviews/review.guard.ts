import { prisma } from "../../lib/prisma.js";
import { getRevieweeId, isExchangeReviewable } from "./review.criteria.js";
import { ReviewError } from "./review.errors.js";

export const assertCanReviewExchange = async (
  reviewerId: number,
  serviceExchangeId: number,
) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: serviceExchangeId },
    select: {
      id: true,
      status: true,
      escrow_status: true,
      provider_id: true,
      consumer_id: true,
    },
  });

  if (!exchange) {
    throw new ReviewError("Service exchange not found", 404);
  }

  if (!isExchangeReviewable(exchange)) {
    throw new ReviewError(
      "Reviews can only be submitted for completed service exchanges",
      400,
    );
  }

  const isParticipant =
    exchange.provider_id === reviewerId ||
    exchange.consumer_id === reviewerId;

  if (!isParticipant) {
    throw new ReviewError(
      "You do not have access to this resource",
      403,
    );
  }

  const existingReview = await prisma.review.findUnique({
    where: {
      service_exchange_id_reviewer_id: {
        service_exchange_id: serviceExchangeId,
        reviewer_id: reviewerId,
      },
    },
    select: { id: true },
  });

  if (existingReview) {
    throw new ReviewError(
      "You have already submitted a review for this service exchange",
      409,
    );
  }

  return { revieweeId: getRevieweeId(exchange, reviewerId) };
};
