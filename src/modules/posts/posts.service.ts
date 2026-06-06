import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { CreatePostInput, SearchPostsQuery, UpdatePostInput } from "./posts.schema.js";

const postSelect = {
    id: true,
    title: true,
    description: true,
    category: true,
    service_mode: true,
    assigned_time_credits: true,
    status: true,
    created_at: true,
    updated_at: true,
    user: {
        select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
            trust_rating: true,
        },
    },
}

export const createPostService = async (data: CreatePostInput,userId: number) => {
    const post = await prisma.post.create({
    data: {
        user_id: userId,
        title: data.title,
        description: data.description,
        category: data.category,
        service_mode: data.serviceMode,
        assigned_time_credits: data.assignedTimeCredits,
        status: data.status,
    },
    select: postSelect,
    })
    return post
}

const countOccurrences = (text: string, query: string) => {
    if (!query) {
        return 0
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const match = text.match(new RegExp(escaped, "gi"))
    return match ? match.length : 0
}

const scorePostRelevance = (title: string, description: string, query: string) => {
    const titleHits = countOccurrences(title, query)
    const descriptionHits = countOccurrences(description, query)
    return titleHits * 2 + descriptionHits
}

export const listPublishedPostsService = async (filters: SearchPostsQuery) => {
    const where: Prisma.PostWhereInput = {
        status: "PUBLISHED",
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.serviceMode ? { service_mode: filters.serviceMode } : {}),
        ...(filters.minCredits || filters.maxCredits
        ? {
            assigned_time_credits: {
                ...(filters.minCredits !== undefined ? { gte: filters.minCredits }: {}),
                ...(filters.maxCredits !== undefined? { lte: filters.maxCredits }: {}),
            },
        } : {}),
        ...(filters.minTrustRating !== undefined
        ? { user: { is: { trust_rating: { gte: filters.minTrustRating } } } } : {}),
        ...(filters.q
        ? {
            OR: [
                { title: { contains: filters.q, mode: "insensitive" as const } },
                { description: { contains: filters.q, mode: "insensitive" as const } },
            ],}: {}),
    }

    const orderBy = filters.sort === "newest" || filters.sort === "nearest"
        ? { created_at: "desc" as const }: undefined

    const posts = await prisma.post.findMany({
        where,
        ...(orderBy ? { orderBy } : {}),
        select: postSelect,
    })

    if (filters.sort === "relevance" && filters.q) {
        return [...posts].sort((a, b) => {
            const scoreA = scorePostRelevance(a.title, a.description, filters.q || "")
            const scoreB = scorePostRelevance(b.title, b.description, filters.q || "")
            if (scoreA === scoreB) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            }
            return scoreB - scoreA
        })
    }

    return posts
}

export const listMyPostsService = async (userId: number) => {
    return prisma.post.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: postSelect,
    })
}

export const getPostByIdService = async (postId: number, userId: number) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { ...postSelect, user_id: true, status: true },
    })
    if (!post) {
        throw new Error("Post not found")
    }
    if (post.status !== "PUBLISHED") {
        throw new Error("You cannot view this post")
    }
    const { user_id: _userId, ...safePost } = post
    return safePost
}

export const updatePostService = async (postId: number,userId: number,data: UpdatePostInput) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { user_id: true },
    })
    if (!post) {
        throw new Error("Post not found");
    }
    if (post.user_id !== userId) {
        throw new Error("You can only edit your own posts");
    }

    return prisma.post.update({
        where: { id: postId },
        data: {
            title: data.title,
            description: data.description,
            category: data.category,
            service_mode: data.serviceMode,
            assigned_time_credits: data.assignedTimeCredits,
            status: data.status,
        },
        select: postSelect,
    })
}

export const deletePostService = async (postId: number, userId: number) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { user_id: true },
    })
    if (!post) {
        throw new Error("Post not found")
    }
    if (post.user_id !== userId) {
        throw new Error("You can only delete your own posts")
    }

    await prisma.post.delete({ where: { id: postId } })
}

export const savePostService = async (postId: number, userId: number) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { user_id: true, status: true },
    })
    if (!post) {
        throw new Error("Post not found");
    }
    if (post.status !== "PUBLISHED" || post.user_id == userId) {
        throw new Error("You cannot save this post")
    }

    return prisma.savedPost.upsert({
        where: {
            user_id_post_id: {
                user_id: userId,
                post_id: postId,
            },
        },
        update: {},
        create: { user_id: userId, post_id: postId },
    })
}

export const unsavePostService = async (postId: number, userId: number) => {
    const saved = await prisma.savedPost.findUnique({
        where: {
            user_id_post_id: {
                user_id: userId,
                post_id: postId,
            }}
        })
    if (!saved) {
        throw new Error("You have not saved this post")
    }
    await prisma.savedPost.delete({
        where: {
            user_id_post_id: {
                user_id: userId,
                post_id: postId,
            },
        },
    })
}

export const listSavedPostsService = async (userId: number) => {
    return prisma.savedPost.findMany({
        where: {
            user_id: userId,
            post: { status: { in: ["PUBLISHED", "DRAFT"] } },
        },
        orderBy: { created_at: "desc" },
        select: {
            id: true,
            created_at: true,
            post: {
                select: postSelect,
            }
        },
    })
}
