import { prisma } from "../../lib/prisma.js";
import {
  fetchSearchResults,
  RecommenderUnavailableError,
  type RecommenderSearchItem,
} from "../recommender/recommender.client.js";
import { hydratePublishedPostsById } from "./posts.hydration.js";
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

const fallbackSearch = async (
  query: string,
  topK: number,
  filters?: SearchPostsInput["filters"],
) => {
  const whereClause: any = {
    status: "PUBLISHED",
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };

  if (filters) {
    if (filters.category) whereClause.category = filters.category;
    if (filters.serviceMode) whereClause.service_mode = filters.serviceMode;
    if (filters.minCredits !== undefined || filters.maxCredits !== undefined) {
      whereClause.assigned_time_credits = {
        ...(filters.minCredits !== undefined ? { gte: filters.minCredits } : {}),
        ...(filters.maxCredits !== undefined ? { lte: filters.maxCredits } : {}),
      };
    }
    if (filters.city) {
      whereClause.city = { contains: filters.city, mode: "insensitive" };
    }
    if (filters.area) {
      whereClause.area = { contains: filters.area, mode: "insensitive" };
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: topK,
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
    // If filters are specified, request a larger page size from the recommender
    // to ensure we have enough semantic candidates to filter in SQL.
    const recommenderTopK = filters ? Math.max(100, topK * 5) : topK;

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

    const whereClause: any = {
      id: { in: orderedIds },
      status: "PUBLISHED",
    };

    if (filters) {
      if (filters.category) whereClause.category = filters.category;
      if (filters.serviceMode) whereClause.service_mode = filters.serviceMode;
      if (filters.minCredits !== undefined || filters.maxCredits !== undefined) {
        whereClause.assigned_time_credits = {
          ...(filters.minCredits !== undefined ? { gte: filters.minCredits } : {}),
          ...(filters.maxCredits !== undefined ? { lte: filters.maxCredits } : {}),
        };
      }
      if (filters.city) {
        whereClause.city = { contains: filters.city, mode: "insensitive" };
      }
      if (filters.area) {
        whereClause.area = { contains: filters.area, mode: "insensitive" };
      }
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      select: postSelect,
    });

    const byId = new Map(
      (posts as PostRecord[]).map((post) => [post.id, post]),
    );

    const results = orderedIds
      .map((id) => byId.get(id))
      .filter((post): post is PostRecord => Boolean(post))
      .map((post) => {
        const aiItem = scoreByPostId.get(post.id);
        return {
          post: toPostResponse(post),
          scores: aiItem ? mapScores(aiItem) : null,
        };
      });

    const finalResults = filters ? results.slice(0, topK) : results;

    return {
      query: aiResponse.query,
      count: finalResults.length,
      source: "recommender" as const,
      results: finalResults,
    };
  } catch (err: unknown) {
    if (err instanceof RecommenderUnavailableError) {
      return fallbackSearch(query, topK, filters);
    }
    throw err;
  }
};
