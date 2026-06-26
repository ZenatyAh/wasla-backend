import type { Request, Response } from "express";
import { z } from "zod";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { prisma } from "../../lib/prisma.js";
import {
  postSelect,
  toPostResponse,
  type PostRecord,
} from "../posts/posts.mapper.js";
import { hydratePublishedPostsById } from "../posts/posts.hydration.js";
import { listPostsQuerySchema } from "../posts/posts.schema.js";
import {
  buildPostCursorFilter,
  paginateById,
} from "../posts/posts.pagination.js";
import {
  fetchRecommendedPostIds,
  RecommenderUnavailableError,
} from "./recommender.client.js";
import { buildRecommenderExport } from "./recommender.export.service.js";

const userIdSchema = z.coerce.number().int().positive();
const RECOMMENDER_PAGE_FETCH_CAP = 200;

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
const mapFeedPosts = (posts: PostRecord[]) => posts.map(toPostResponse);

type FeedPage = {
  posts: ReturnType<typeof mapFeedPosts>;
  nextCursor: number | null;
};

const chronologicalFeed = async (
  limit: number,
  cursor?: number,
): Promise<FeedPage> => {
  const cursorFilter = await buildPostCursorFilter(cursor);
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED", ...cursorFilter },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: postSelect,
  });
  const { items, nextCursor } = paginateById(rows as PostRecord[], limit);
  return { posts: mapFeedPosts(items), nextCursor };
};

const hydrateFeedPosts = async (order: number[]) =>
  hydratePublishedPostsById(order);

const recommendedFeed = async (
  userId: number,
  limit: number,
  cursor?: number,
): Promise<FeedPage | null> => {
  const order = await fetchRecommendedPostIds(userId, RECOMMENDER_PAGE_FETCH_CAP);

  let startIndex = 0;
  if (cursor) {
    const cursorIndex = order.indexOf(cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
    }
  }

  const pageIds = order.slice(startIndex, startIndex + limit + 1);
  const { items, nextCursor } = paginateById(
    pageIds.map((id) => ({ id })),
    limit,
  );

  if (items.length === 0) {
    return null;
  }

  return {
    posts: await hydrateFeedPosts(items.map((item) => item.id)),
    nextCursor,
  };
};

const feedResponse = (page: FeedPage, source: "recommender" | "fallback") => ({
  posts: page.posts,
  nextCursor: page.nextCursor,
  source,
});

export const feedController = async (req: Request, res: Response) => {
  let userId: number;
  try {
    userId = userIdSchema.parse(req.params.userId);
  } catch {
    return sendError(res, 400, "Invalid user id");
  }

  let query;
  try {
    query = listPostsQuerySchema.parse(req.query);
  } catch {
    return sendError(res, 400, "Invalid request data");
  }

  const limit = query.limit ?? 20;

  try {
    const page = await recommendedFeed(userId, limit, query.cursor);

    if (!page) {
      return res.json(
        feedResponse(await chronologicalFeed(limit, query.cursor), "fallback"),
      );
    }

    return res.json(feedResponse(page, "recommender"));
  } catch (err: unknown) {
    if (err instanceof RecommenderUnavailableError) {
      // #region agent log
      fetch('http://127.0.0.1:7430/ingest/c20838bf-9e24-484e-8317-a8bd52c8f7b2',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d357df'},body:JSON.stringify({sessionId:'d357df',location:'recommender.controller.ts:feed',message:'feed using fallback',data:{userId,reason:err.message},timestamp:Date.now(),hypothesisId:'H3'}),signal:AbortSignal.timeout(300)}).catch(()=>{});
      // #endregion
      return res.json(
        feedResponse(await chronologicalFeed(limit, query.cursor), "fallback"),
      );
    }
    return sendError(res, 500, getErrorMessage(err, "Feed failed"));
  }
};
