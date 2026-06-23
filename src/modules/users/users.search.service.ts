import { prisma } from "../../lib/prisma.js";
import {
  toSearchUserResponse,
  type SearchUserRecord,
} from "./profile.mapper.js";
import type { SearchUsersInput } from "./users.search.schema.js";

const searchUserSelect = {
  id: true,
  username: true,
  full_name: true,
  bio: true,
  profile_image: true,
  location: true,
  skills: {
    select: {
      skill_type: true,
      skill: { select: { name: true } },
    },
    orderBy: { created_at: "asc" as const },
  },
} as const;

export const searchUsersService = async (input: SearchUsersInput) => {
  const { query, topK } = input;

  const users = await prisma.user.findMany({
    where: {
      deleted_at: null,
      OR: [
        { full_name: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
        { bio: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } },
        {
          skills: {
            some: {
              skill: {
                name: { contains: query, mode: "insensitive" },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ full_name: "asc" }, { id: "asc" }],
    take: topK,
    select: searchUserSelect,
  });

  const results = (users as SearchUserRecord[]).map((user) => ({
    user: toSearchUserResponse(user),
  }));

  return {
    query,
    count: results.length,
    source: "database" as const,
    results,
  };
};
