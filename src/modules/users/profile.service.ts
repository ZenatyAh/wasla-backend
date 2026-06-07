import { prisma } from "../../lib/prisma.js";
import { ChatError } from "../chat/chat.errors.js";
import type { UpdateProfileInput } from "./profile.schema.js";
import {
  toBasicProfile,
  toRecentExchange,
} from "./profile.mapper.js";

export const getUserProfile = async (userId: number) => {
  const [user, providedCount, receivedCount, ratingAgg, recentExchanges] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          full_name: true,
          username: true,
          bio: true,
          profile_image: true,
          available_balance: true,
        },
      }),
      prisma.serviceExchange.count({
        where: { provider_id: userId, status: "COMPLETED" },
      }),
      prisma.serviceExchange.count({
        where: { consumer_id: userId, status: "COMPLETED" },
      }),
      prisma.review.aggregate({
        where: { reviewee_id: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.serviceExchange.findMany({
        where: {
          status: "COMPLETED",
          OR: [{ provider_id: userId }, { consumer_id: userId }],
        },
        orderBy: { completed_at: "desc" },
        take: 3,
        include: {
          post: { select: { id: true, title: true } },
          provider: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
          consumer: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
      }),
    ]);

  if (!user) {
    throw new ChatError("User not found", 404);
  }

  const reviewCount = ratingAgg._count.rating;

  return {
    profile: {
      ...toBasicProfile(user),
      stats: {
        availableTimeCredits: user.available_balance,
        servicesProvided: providedCount,
        servicesReceived: receivedCount,
      },
      trustRating: {
        average:
          reviewCount > 0 && ratingAgg._avg.rating !== null
            ? Math.round(ratingAgg._avg.rating * 10) / 10
            : null,
        count: reviewCount,
      },
      recentExchanges: recentExchanges.map((exchange) =>
        toRecentExchange(exchange, userId),
      ),
    },
  };
};

export const updateUserProfile = async (
  userId: number,
  data: UpdateProfileInput,
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined ? { full_name: data.name } : {}),
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.profilePicture !== undefined
        ? { profile_image: data.profilePicture }
        : {}),
    },
    select: {
      full_name: true,
      username: true,
      bio: true,
      profile_image: true,
      available_balance: true,
    },
  });

  return { profile: toBasicProfile(user) };
};

export const assertUserExists = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new ChatError("User not found", 404);
  }
};
