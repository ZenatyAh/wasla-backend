import { prisma } from "../../lib/prisma.js";
import { postSelect, toPostResponse, type PostRecord } from "./posts.mapper.js";

/** Load published posts by id, preserving the given order. */
export const hydratePublishedPostsById = async (order: number[]) => {
  if (order.length === 0) {
    return [];
  }

  const posts = await prisma.post.findMany({
    where: { id: { in: order }, status: "PUBLISHED" },
    select: postSelect,
  });
  const byId = new Map(
    (posts as PostRecord[]).map((post) => [post.id, post]),
  );

  return order
    .map((id) => byId.get(id))
    .filter((post): post is PostRecord => Boolean(post))
    .map(toPostResponse);
};
