import type { Request, Response } from "express";
import { z } from "zod";
import {createPostService,deletePostService,getPostByIdService,listMyPostsService,listPublishedPostsService,listSavedPostsService,savePostService,unsavePostService,updatePostService,} from "./posts.service.js";
import type { CreatePostInput, UpdatePostInput } from "./posts.schema.js";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";

const postIdSchema = z.coerce.number().int().positive();

const getUserId = (req: Request) => {
  const userId = Number(req.user?.userId)
  if (!Number.isInteger(userId)) {
    return null
  }
  return userId
}

export const createPostController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return sendError(res, 401, "Unauthorized")
    }

    const data: CreatePostInput = req.body;
    const post = await createPostService(data, userId);

    return res.status(201).json({ post });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Create post failed"));
  }
};

export const listPublishedPostsController = async (_req: Request,res: Response) => {
  try {
    const posts = await listPublishedPostsService()
    return res.json({ posts })
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Fetch posts failed"))
  }
};

export const getPostByIdController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return sendError(res, 401, "Unauthorized")
    }

    const postId = postIdSchema.parse(req.params.postId)
    const post = await getPostByIdService(postId, userId)
    return res.json({ post })
  } catch (err: unknown) {
    return sendError(res, 404, getErrorMessage(err, "Post not found"))
  }
};

export const listMyPostsController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return sendError(res, 401, "Unauthorized")
    }

    const posts = await listMyPostsService(userId);
    return res.json({ posts });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Fetch posts failed"));
  }
};

export const updatePostController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return sendError(res, 401, "Unauthorized")
    }

    const postId = postIdSchema.parse(req.params.postId)
    const data: UpdatePostInput = req.body
    const post = await updatePostService(postId, userId, data)

    return res.json({ post })
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Update post failed"))
  }
};

export const deletePostController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req)
    if (!userId) {
      return sendError(res, 401, "Unauthorized")
    }

    const postId = postIdSchema.parse(req.params.postId)
    await deletePostService(postId, userId)

    return res.status(204).end()
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Delete post failed"));
  }
};

export const savePostController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const postId = postIdSchema.parse(req.params.postId);
    const savedPost = await savePostService(postId, userId);
    return res.status(201).json({ savedPost });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Save post failed"));
  }
};

export const unsavePostController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const postId = postIdSchema.parse(req.params.postId);
    await unsavePostService(postId, userId);
    return res.status(200).json({ message: "Post unsaved successfully" });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Unsave post failed"));
  }
};

export const listSavedPostsController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const savedPosts = await listSavedPostsService(userId);
    return res.json({ savedPosts });
  } catch (err: unknown) {
    return sendError(res, 400, getErrorMessage(err, "Fetch saved posts failed"));
  }
};
