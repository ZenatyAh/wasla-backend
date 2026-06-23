import {
  RECOMMENDER_API_KEY,
  RECOMMENDER_ENABLED,
  RECOMMENDER_TIMEOUT_MS,
  RECOMMENDER_URL,
} from "../../common/utils/env.js";
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
      skill: { select: { name: true } },
    },
  },
} as const;

type RecommendItem = { post_id: string; score?: number };
type RecommendResponse = { recommendations: RecommendItem[] };

class RecommenderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommenderUnavailableError";
  }
}

const request = async <T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> => {
  if (!RECOMMENDER_ENABLED) {
    throw new RecommenderUnavailableError("Recommender is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECOMMENDER_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${RECOMMENDER_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": RECOMMENDER_API_KEY,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new RecommenderUnavailableError(message);
    }

    if (!response.ok) {
      throw new RecommenderUnavailableError(
        `Recommender responded ${response.status}`,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fire-and-forget wrapper: never throws into the caller's request flow, just
 * logs. Recommender hiccups must never block a user-facing API call.
 */
const fireAndForget = (label: string, run: () => Promise<unknown>): void => {
  if (!RECOMMENDER_ENABLED) {
    return;
  }
  void run().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[recommender] ${label} push failed: ${message}`);
  });
};

const postForSyncSelect = {
  id: true,
  user_id: true,
  title: true,
  description: true,
  category: true,
  service_mode: true,
  assigned_time_credits: true,
  created_at: true,
  status: true,
  user: { select: { location: true, ...skillInclude } },
} as const;

const loadPostForSync = async (
  postId: number,
): Promise<RecommenderPost | null> => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: postForSyncSelect,
  });
  if (!post || post.status !== "PUBLISHED") {
    return null;
  }
  return mapPost(post as PostForMapping);
};

const loadUserForSync = async (
  userId: number,
): Promise<RecommenderUser | null> => {
  const [user, agg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        location: true,
        available_balance: true,
        ...skillInclude,
      },
    }),
    prisma.review.aggregate({
      where: { reviewee_id: userId },
      _avg: { rating: true },
    }),
  ]);
  return user
    ? mapUser(user as UserForMapping, agg._avg.rating ?? 0)
    : null;
};

/**
 * POST /sync/bootstrap — rebuild the recommender index from Express export.
 * Used when a post is deleted or unpublished (no per-post delete endpoint).
 */
export const syncBootstrapRebuild = (): void => {
  fireAndForget("bootstrap", () => request("POST", "/sync/bootstrap", {}));
};

/** POST /sync/post — after a published post is created or updated. */
export const syncPost = (postId: number): void => {
  fireAndForget("post", async () => {
    const post = await loadPostForSync(postId);
    if (post) {
      await request("POST", "/sync/post", post);
    }
  });
};

/** POST /sync/users — after a user profile changes. */
export const syncUser = (userId: number): void => {
  fireAndForget("users", async () => {
    const user = await loadUserForSync(userId);
    if (user) {
      await request("POST", "/sync/users", { users: [user] });
    }
  });
};

/** POST /sync/interaction — after a click / save / unsave / apply. */
export const syncInteraction = (input: {
  userId: number | string;
  postId: number | string;
  action: "click" | "save" | "unsave" | "apply";
}): void => {
  fireAndForget("interaction", () =>
    request("POST", "/sync/interaction", mapInteraction(input)),
  );
};

/**
 * POST /recommend — returns an ordered list of post IDs for the feed proxy.
 * Throws RecommenderUnavailableError when the service is down/disabled so the
 * caller can fall back to a chronological feed.
 */
export const fetchRecommendedPostIds = async (
  userId: number | string,
  topK = 20,
): Promise<number[]> => {
  const data = await request<RecommendResponse>("POST", "/recommend", {
    user_id: String(userId),
    top_k: topK,
  });
  return data.recommendations
    .map((item) => Number(item.post_id))
    .filter((id) => Number.isInteger(id));
};

export { RecommenderUnavailableError };
