import { prisma } from "../../lib/prisma.js";
import {
  fetchSearchResults,
  RecommenderUnavailableError,
  type RecommenderSearchItem,
} from "../recommender/recommender.client.js";
import { postSelect, toPostResponse, type PostRecord } from "./posts.mapper.js";
import type { SearchPostsInput } from "./posts.schema.js";

type SearchScores = {
  similarityScore: number;
  freshness: number;
  trust: number;
  finalScore: number;
};

const mapScores = (item: RecommenderSearchItem): SearchScores => ({
  similarityScore: item.similarity_score,
  freshness: item.freshness,
  trust: item.trust,
  finalScore: item.final_score,
});

const hasActiveFilters = (filters?: SearchPostsInput["filters"]) =>
  Boolean(
    filters &&
      (filters.category !== undefined ||
        filters.serviceMode !== undefined ||
        filters.minCredits !== undefined ||
        filters.maxCredits !== undefined ||
        filters.location !== undefined),
  );

const countPublishedPosts = async () =>
  prisma.post.count({ where: { status: "PUBLISHED" } });

const countFilteredPublishedPosts = async (
  filters?: SearchPostsInput["filters"],
) =>
  prisma.post.count({
    where: buildFilteredWhereClause(filters, { status: "PUBLISHED" }),
  });

const resolveRecommenderTopK = async (
  topK: number | undefined,
  filters?: SearchPostsInput["filters"],
): Promise<number> => {
  if (hasActiveFilters(filters)) {
    return countFilteredPublishedPosts(filters);
  }

  if (topK !== undefined) {
    return topK;
  }

  return countPublishedPosts();
};

const limitResults = <T>(
  items: T[],
  topK: number | undefined,
  filters?: SearchPostsInput["filters"],
) => {
  if (hasActiveFilters(filters)) {
    return items;
  }

  return topK !== undefined ? items.slice(0, topK) : items;
};

const buildFilteredWhereClause = (
  filters?: SearchPostsInput["filters"],
  baseWhere: Record<string, unknown> = {},
) => {
  const whereClause: Record<string, unknown> = { ...baseWhere };

  if (!filters) {
    return whereClause;
  }

  if (filters.category) whereClause.category = filters.category;
  if (filters.serviceMode) whereClause.service_mode = filters.serviceMode;
  if (filters.minCredits !== undefined || filters.maxCredits !== undefined) {
    whereClause.assigned_time_credits = {
      ...(filters.minCredits !== undefined ? { gte: filters.minCredits } : {}),
      ...(filters.maxCredits !== undefined ? { lte: filters.maxCredits } : {}),
    };
  }
  if (filters.location) {
    whereClause.user = {
      location: { contains: filters.location, mode: "insensitive" },
    };
  }

  return whereClause;
};

const fallbackSearch = async (
  query: string,
  topK: number | undefined,
  filters?: SearchPostsInput["filters"],
) => {
  const whereClause = buildFilteredWhereClause(filters, {
    status: "PUBLISHED",
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  });

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...(topK !== undefined && !hasActiveFilters(filters) ? { take: topK } : {}),
    select: postSelect,
  });

  return {
    query,
    count: posts.length,
    source: "fallback" as const,
    results: (posts as PostRecord[]).map((post) => ({
      post: toPostResponse(post),
      scores: null,
    })),
  };
};

export const searchPostsService = async (input: SearchPostsInput) => {
  const { query, topK, threshold, filters } = input;

  try {
    const recommenderTopK = await resolveRecommenderTopK(topK, filters);

    if (recommenderTopK === 0) {
      return {
        query,
        count: 0,
        source: "recommender" as const,
        results: [],
      };
    }

    const aiResponse = await fetchSearchResults(query, {
      top_k: recommenderTopK,
      threshold,
    });

    const scoreByPostId = new Map<number, RecommenderSearchItem>();
    const orderedIds: number[] = [];

    for (const item of aiResponse.results) {
      const id = Number(item.post_id);
      if (!Number.isInteger(id)) {
        continue;
      }
      orderedIds.push(id);
      scoreByPostId.set(id, item);
    }

    if (orderedIds.length === 0) {
      return {
        query: aiResponse.query,
        count: 0,
        source: "recommender" as const,
        results: [],
      };
    }

    const whereClause = buildFilteredWhereClause(filters, {
      id: { in: orderedIds },
      status: "PUBLISHED",
    });

    const posts = await prisma.post.findMany({
      where: whereClause,
      select: postSelect,
    });

    const byId = new Map(
      (posts as PostRecord[]).map((post) => [post.id, post]),
    );

    const results = limitResults(
      orderedIds
        .map((id) => byId.get(id))
        .filter((post): post is PostRecord => Boolean(post))
        .map((post) => {
          const aiItem = scoreByPostId.get(post.id);
          return {
            post: toPostResponse(post),
            scores: aiItem ? mapScores(aiItem) : null,
          };
        }),
      topK,
      filters,
    );

    return {
      query: aiResponse.query,
      count: results.length,
      source: "recommender" as const,
      results,
    };
  } catch (err: unknown) {
    if (err instanceof RecommenderUnavailableError) {
      return fallbackSearch(query, topK, filters);
    }
    throw err;
  }
};
