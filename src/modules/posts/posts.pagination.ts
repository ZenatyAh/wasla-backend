import { prisma } from "../../lib/prisma.js";

export const buildPostCursorFilter = async (cursor?: number) => {
  if (!cursor) {
    return {};
  }

  const cursorPost = await prisma.post.findUnique({
    where: { id: cursor },
    select: { id: true, created_at: true },
  });

  if (!cursorPost) {
    return {};
  }

  return {
    OR: [
      { created_at: { lt: cursorPost.created_at } },
      {
        AND: [
          { created_at: cursorPost.created_at },
          { id: { lt: cursorPost.id } },
        ],
      },
    ],
  };
};

export const buildSavedPostCursorFilter = async (cursor?: number) => {
  if (!cursor) {
    return {};
  }

  const cursorSavedPost = await prisma.savedPost.findUnique({
    where: { id: cursor },
    select: { id: true, created_at: true },
  });

  if (!cursorSavedPost) {
    return {};
  }

  return {
    OR: [
      { created_at: { lt: cursorSavedPost.created_at } },
      {
        AND: [
          { created_at: cursorSavedPost.created_at },
          { id: { lt: cursorSavedPost.id } },
        ],
      },
    ],
  };
};

export const paginateById = <T extends { id: number }>(
  items: T[],
  limit: number,
) => {
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;

  return {
    items: page,
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
};
