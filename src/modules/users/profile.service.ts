import { prisma } from "../../lib/prisma.js";
import { ChatError } from "../chat/chat.errors.js";
import { syncUser } from "../recommender/recommender.client.js";
import { syncUserSkillsByType } from "../skills/userSkills.service.js";
import type { UpdateProfileInput } from "./profile.schema.js";
import {
  toBasicProfile,
  toProfileSkills,
  toRecentExchange,
  toUpdatableProfile,
} from "./profile.mapper.js";

export const getUserProfile = async (userId: number) => {
  const [
    user,
    providedCount,
    receivedCount,
    ratingAgg,
    recentExchanges,
    userSkills,
  ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          full_name: true,
          username: true,
          bio: true,
          profile_image: true,
          available_balance: true,
          deleted_at: true,
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
      prisma.userSkill.findMany({
        where: { user_id: userId },
        select: {
          skill_type: true,
          skill: { select: { name: true } },
        },
        orderBy: { created_at: "asc" },
      }),
    ]);

  if (!user || user.deleted_at) {
    throw new ChatError("User not found", 404);
  }

  const reviewCount = ratingAgg._count.rating;

  return {
    profile: {
      ...toBasicProfile(user),
      ...toProfileSkills(userSkills),
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
  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
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

    if (data.offeredSkills !== undefined) {
      await syncUserSkillsByType(tx, userId, data.offeredSkills, "OFFER");
    }

    if (data.requiredSkills !== undefined) {
      await syncUserSkillsByType(tx, userId, data.requiredSkills, "REQUEST");
    }

    return updatedUser;
  });

  const userSkills = await prisma.userSkill.findMany({
    where: { user_id: userId },
    select: {
      skill_type: true,
      skill: { select: { name: true } },
    },
    orderBy: { created_at: "asc" },
  });

  syncUser(userId);

  return { profile: toUpdatableProfile(user, userSkills) };
};

export const assertUserExists = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deleted_at: true },
  });

  if (!user || user.deleted_at) {
    throw new ChatError("User not found", 404);
  }
};
