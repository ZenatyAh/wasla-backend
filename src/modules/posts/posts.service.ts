import { prisma } from "../../lib/prisma.js";
import {
    syncInteraction,
    syncPost,
} from "../recommender/recommender.client.js";
import type { CreatePostInput, UpdatePostInput } from "./posts.schema.js";

const postSelect = {
    id: true,
    user_id: true,
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
        },
    },
}

type PostRecord = {
    id: number
    user_id: number
    title: string
    description: string
    category: string
    service_mode: string
    assigned_time_credits: number
    status: string
    created_at: Date
    updated_at: Date
    user: {
        id: number
        username: string
        full_name: string
        profile_image: string | null
    }
}

type SavedPostRecord = {
    id: number
    user_id: number
    post_id: number
    created_at: Date
}

const toPostResponse = (post: PostRecord) => ({
    id: post.id,
    userId: post.user_id,
    title: post.title,
    description: post.description,
    category: post.category,
    serviceMode: post.service_mode,
    assignedTimeCredits: post.assigned_time_credits,
    status: post.status,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    user: post.user,
})

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
    },
    select: postSelect,
    })
    syncPost(post.id)
    return toPostResponse(post)
}

export const listPublishedPostsService = async () => {
    const posts = await prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { created_at: "desc" },
        select: postSelect,
    })
    return posts.map(toPostResponse)
}

export const listMyPostsService = async (userId: number) => {
    const posts = await prisma.post.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: postSelect,
    })
    return posts.map(toPostResponse)
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
        data: buildPostUpdateData(data),
        select: postSelect,
    }).then((updated) => {
        syncPost(updated.id)
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
}

export const listSavedPostsService = async (userId: number) => {
    const savedPosts = await prisma.savedPost.findMany({
        where: {
            user_id: userId,
            post: { status: "PUBLISHED" },
        },
        orderBy: { created_at: "desc" },
        select: {
            id: true,
            user_id: true,
            post_id: true,
            created_at: true,
            post: {
                select: postSelect,
            }
        },
    })
    return savedPosts.map((savedPost) => ({
        ...toSavedPostResponse(savedPost),
        post: toPostResponse(savedPost.post),
    }))
}
