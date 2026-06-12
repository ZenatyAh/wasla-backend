import type { Request, Response } from "express";
import { z } from "zod";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
  postSelect,
  toPostResponse,
  type PostRecord,
} from "../posts/posts.mapper.js";
import {
  fetchRecommendedPostIds,
  RecommenderUnavailableError,
} from "./recommender.client.js";
import { buildRecommenderExport } from "./recommender.export.service.js";

const userIdSchema = z.coerce.number().int().positive();

/**
 * GET /internal/recommender-export
 * Full snapshot of users, posts, and interactions for the recommender's
 * bootstrap / nightly rebuild. Protected by the shared internal token.
 */
export const recommenderExportController = async (
  _req: Request,
  res: Response,
) => {
  try {
    const payload = await buildRecommenderExport();
    return res.json(payload);
  } catch (err: unknown) {
    return sendError(res, 500, getErrorMessage(err, "Export failed"));
  }
};

/**
 * GET /feed/:userId
 * Asks the recommender for an ordered list of post IDs, hydrates them from our
 * DB preserving order, and falls back to a chronological feed when the
 * recommender is unavailable (down, disabled, timed out, or 503).
 */
const FEED_LIMIT = 20;

const mapFeedPosts = (posts: PostRecord[]) => posts.map(toPostResponse);

const chronologicalFeed = async () => {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { created_at: "desc" },
    take: FEED_LIMIT,
    select: postSelect,
  });
  return mapFeedPosts(posts as PostRecord[]);
};

const hydrateFeedPosts = async (order: number[]) => {
  const posts = await prisma.post.findMany({
    where: { id: { in: order }, status: "PUBLISHED" },
    select: postSelect,
  });
  const byId = new Map(
    (posts as PostRecord[]).map((post) => [post.id, post]),
  );
  const ordered = order
    .map((id) => byId.get(id))
    .filter((post): post is PostRecord => Boolean(post));
  return mapFeedPosts(ordered);
};

export const feedController = async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = userIdSchema.parse(req.params.userId);
  } catch {
    return sendError(res, 400, "Invalid user id");
  }

  try {
    const order = await fetchRecommendedPostIds(userId, FEED_LIMIT);

    if (order.length === 0) {
      return res.json({ posts: await chronologicalFeed(), source: "fallback" });
    }

    return res.json({
      posts: await hydrateFeedPosts(order),
      source: "recommender",
    });
  } catch (err: unknown) {
    if (err instanceof RecommenderUnavailableError) {
      return res.json({ posts: await chronologicalFeed(), source: "fallback" });
    }
    return sendError(res, 500, getErrorMessage(err, "Feed failed"));
  }
};
