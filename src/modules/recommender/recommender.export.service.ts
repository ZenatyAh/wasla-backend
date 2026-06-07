import { prisma } from "../../lib/prisma.js";
import {
  mapInteraction,
  mapPost,
  mapUser,
  type PostForMapping,
  type RecommenderInteraction,
  type RecommenderPost,
  type RecommenderUser,
  type UserForMapping,
} from "./recommender.mapper.js";

const skillInclude = {
  skills: {
    select: {
      skill_type: true,
      skill: { select: { skill_name: true } },
    },
  },
} as const;

/** Average received-review rating (0–5) keyed by user id, for trust_score. */
const buildTrustScoreMap = async (): Promise<Map<number, number>> => {
  const grouped = await prisma.review.groupBy({
    by: ["reviewee_id"],
    _avg: { rating: true },
  });
  return new Map(
    grouped.map((row) => [row.reviewee_id, row._avg.rating ?? 0]),
  );
};

const fetchUsers = async (
  trustScores: Map<number, number>,
): Promise<RecommenderUser[]> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      location: true,
      available_balance: true,
      ...skillInclude,
    },
  });
  return (users as UserForMapping[]).map((user) =>
    mapUser(user, trustScores.get(user.id) ?? 0),
  );
};

const fetchPosts = async (): Promise<RecommenderPost[]> => {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      user_id: true,
      title: true,
      description: true,
      category: true,
      service_mode: true,
      assigned_time_credits: true,
      created_at: true,
      user: {
        select: {
          location: true,
          ...skillInclude,
        },
      },
    },
  });
  return (posts as PostForMapping[]).map(mapPost);
};

/**
 * Interactions are the implicit-feedback signal for the recommender. We export
 * `save` (SavedPost) and `apply` (a requested ServiceExchange tied to a post).
 * Clicks are not tracked yet, so they are intentionally omitted.
 */
const fetchInteractions = async (): Promise<RecommenderInteraction[]> => {
  const [saves, applies] = await Promise.all([
    prisma.savedPost.findMany({
      select: { user_id: true, post_id: true, created_at: true },
    }),
    prisma.serviceExchange.findMany({
      where: { post_id: { not: null } },
      select: { consumer_id: true, post_id: true, created_at: true },
    }),
  ]);

  const saveInteractions = saves.map((row) =>
    mapInteraction({
      userId: row.user_id,
      postId: row.post_id,
      action: "save",
      timestamp: row.created_at,
    }),
  );

  const applyInteractions = applies
    .filter((row) => row.post_id !== null)
    .map((row) =>
      mapInteraction({
        userId: row.consumer_id,
        postId: row.post_id as number,
        action: "apply",
        timestamp: row.created_at,
      }),
    );

  return [...saveInteractions, ...applyInteractions];
};

/**
 * Full snapshot used by the recommender for the initial bootstrap and the
 * nightly rebuild. Matches the response shape in docs/express-integration.md.
 */
export const buildRecommenderExport = async () => {
  const trustScores = await buildTrustScoreMap();
  const [users, posts, interactions] = await Promise.all([
    fetchUsers(trustScores),
    fetchPosts(),
    fetchInteractions(),
  ]);
  return { users, posts, interactions };
};
