import { prisma } from "../../lib/prisma.js";
import {
    syncBootstrapRebuild,
    syncInteraction,
    syncPost,
} from "../recommender/recommender.client.js";
import type {
    CreatePostInput,
    ListPostsQuery,
    UpdatePostInput,
} from "./posts.schema.js";
import { postSelect, toPostResponse } from "./posts.mapper.js";
import {
    buildPostCursorFilter,
    buildSavedPostCursorFilter,
    paginateById,
} from "./posts.pagination.js";

type SavedPostRecord = {
    id: number
    user_id: number
    post_id: number
    created_at: Date
}

const toSavedPostResponse = (savedPost: SavedPostRecord) => ({
    id: savedPost.id,
    userId: savedPost.user_id,
    postId: savedPost.post_id,
    createdAt: savedPost.created_at,
})

const buildPostUpdateData = (data: UpdatePostInput) => ({
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.serviceMode !== undefined ? { service_mode: data.serviceMode } : {}),
    ...(data.assignedTimeCredits !== undefined
        ? { assigned_time_credits: data.assignedTimeCredits }
        : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.city !== undefined ? { city: data.city } : {}),
    ...(data.area !== undefined ? { area: data.area } : {}),
})

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
        city: data.city,
        area: data.area,
    },
    select: postSelect,
    })
    syncPost(post.id)
    return toPostResponse(post)
}

export const listPublishedPostsService = async (query: ListPostsQuery) => {
    const limit = query.limit ?? 100
    const cursorFilter = await buildPostCursorFilter(query.cursor)

    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED", ...cursorFilter },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: postSelect,
    })

    const { items, nextCursor } = paginateById(posts, limit)
    return {
        posts: items.map(toPostResponse),
        nextCursor,
    }
}

export const listMyPostsService = async (
    userId: number,
    query: ListPostsQuery,
) => {
    const limit = query.limit ?? 100
    const cursorFilter = await buildPostCursorFilter(query.cursor)

    const posts = await prisma.post.findMany({
        where: { user_id: userId, ...cursorFilter },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: postSelect,
    })

    const { items, nextCursor } = paginateById(posts, limit)
    return {
        posts: items.map(toPostResponse),
        nextCursor,
    }
}

export const getPostByIdService = async (postId: number, userId: number) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { ...postSelect, user_id: true, status: true },
    })
    if (!post) {
        throw new Error("Post not found")
    }
    if (post.status !== "PUBLISHED" && post.user_id !== userId) {
        throw new Error("You cannot view this post")
    }
    return toPostResponse(post)
}

export const updatePostService = async (postId: number,userId: number,data: UpdatePostInput) => {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { user_id: true, service_mode: true, city: true, area: true },
    })
    if (!post) {
        throw new Error("Post not found");
    }
    if (post.user_id !== userId) {
        throw new Error("You can only edit your own posts");
    }

    const newServiceMode = data.serviceMode ?? post.service_mode;
    const newCity = data.city !== undefined ? data.city : post.city;
    const newArea = data.area !== undefined ? data.area : post.area;

    if (newServiceMode === "OFFLINE" && (!newCity || !newArea)) {
        throw new Error("City and Area are required for offline services");
    }

    return prisma.post.update({
        where: { id: postId },
        data: buildPostUpdateData(data),
        select: postSelect,
    }).then((updated) => {
        if (updated.status === "PUBLISHED") {
            syncPost(updated.id)
        } else {
            syncBootstrapRebuild()
        }
        return toPostResponse(updated)
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
    syncBootstrapRebuild()
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

    const savedPost = await prisma.savedPost.upsert({
        where: {
            user_id_post_id: {
                user_id: userId,
                post_id: postId,
            },
        },
        update: {},
        create: { user_id: userId, post_id: postId },
    })
    syncInteraction({ userId, postId, action: "save" })
    return toSavedPostResponse(savedPost)
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
    syncInteraction({ userId, postId, action: "unsave" })
}

export const listSavedPostsService = async (
    userId: number,
    query: ListPostsQuery,
) => {
    const limit = query.limit ?? 100
    const cursorFilter = await buildSavedPostCursorFilter(query.cursor)

    const savedPosts = await prisma.savedPost.findMany({
        where: {
            user_id: userId,
            post: { status: "PUBLISHED" },
            ...cursorFilter,
        },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit + 1,
        select: {
            id: true,
            user_id: true,
            post_id: true,
            created_at: true,
            post: {
                select: postSelect,
            },
        },
    })

    const { items, nextCursor } = paginateById(savedPosts, limit)
    return {
        savedPosts: items.map((savedPost) => ({
            ...toSavedPostResponse(savedPost),
            post: toPostResponse(savedPost.post),
        })),
        nextCursor,
    }
}
