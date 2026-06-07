import { prisma } from "../../lib/prisma.js";
import { assertUserExists } from "../users/profile.service.js";
import { assertCanReviewExchange } from "./review.guard.js";
import { toReviewResponse } from "./review.mapper.js";
import type { CreateReviewInput, ListReviewsQuery } from "./review.schema.js";

const reviewerSelect = {
  id: true,
  username: true,
  full_name: true,
  profile_image: true,
} as const;

export const createReview = async (
  reviewerId: number,
  data: CreateReviewInput,
) => {
  const { revieweeId } = await assertCanReviewExchange(
    reviewerId,
    data.serviceExchangeId,
  );

  const review = await prisma.review.create({
    data: {
      service_exchange_id: data.serviceExchangeId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating: data.rating,
      comment: data.comment,
    },
    include: {
      reviewer: { select: reviewerSelect },
    },
  });

  return { review: toReviewResponse(review) };
};

export const listUserReviews = async (
  revieweeId: number,
  query: ListReviewsQuery,
) => {
  await assertUserExists(revieweeId);

  const limit = query.limit ?? 20;

  const reviews = await prisma.review.findMany({
    where: {
      reviewee_id: revieweeId,
      ...(query.cursor
        ? {
            created_at: {
              lt: (
                await prisma.review.findUnique({
                  where: { id: query.cursor },
                  select: { created_at: true },
                })
              )?.created_at,
            },
          }
        : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit + 1,
    include: {
      reviewer: { select: reviewerSelect },
    },
  });

  const hasMore = reviews.length > limit;
  const page = hasMore ? reviews.slice(0, limit) : reviews;

  return {
    reviews: page.map(toReviewResponse),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
};
