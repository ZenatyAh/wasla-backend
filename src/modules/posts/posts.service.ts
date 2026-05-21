import { prisma } from "../../lib/prisma.js";
import type { CreatePostInput, UpdatePostInput } from "./posts.schema.js";

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

export const listPublishedPostsService = async () => {
    return prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { created_at: "desc" },
        select: postSelect,
    })
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
