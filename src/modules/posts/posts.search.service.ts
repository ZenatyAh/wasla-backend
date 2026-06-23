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

const fallbackSearch = async (query: string, topK: number) => {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
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
  const { query, topK, threshold } = input;

  try {
    const aiResponse = await fetchSearchResults(query, {
      top_k: topK,
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

    const hydrated = await hydratePublishedPostsById(orderedIds);
    const results = hydrated.map((post) => {
      const aiItem = scoreByPostId.get(post.id);
      return {
        post,
        scores: aiItem ? mapScores(aiItem) : null,
      };
    });

    return {
      query: aiResponse.query,
      count: results.length,
      source: "recommender" as const,
      results,
    };
  } catch (err: unknown) {
    if (err instanceof RecommenderUnavailableError) {
      return fallbackSearch(query, topK);
    }
    throw err;
  }
};
