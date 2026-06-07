import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import { ChatError } from "../chat/chat.errors.js";
import { getUserId } from "../chat/chat.utils.js";
import { userIdParamSchema } from "../users/profile.schema.js";
import { ReviewError } from "./review.errors.js";
import { createReviewSchema, listReviewsQuerySchema } from "./review.schema.js";
import { createReview, listUserReviews } from "./review.service.js";

const handleReviewControllerError = (
  res: Response,
  err: unknown,
  fallback: string,
) => {
  if (err instanceof ReviewError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof ChatError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof Error && err.name === "ZodError") {
    return sendError(res, 400, "Invalid request data");
  }

  const message = err instanceof Error ? err.message : fallback;
  return sendError(res, 400, message);
};

export const createReviewController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const data = createReviewSchema.parse(req.body);
    const result = await createReview(userId, data);

    return res.status(201).json(result);
  } catch (err: unknown) {
    return handleReviewControllerError(res, err, "Create review failed");
  }
};

export const listUserReviewsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { id } = userIdParamSchema.parse(req.params);
    const query = listReviewsQuerySchema.parse(req.query);
    const result = await listUserReviews(id, query);

    return res.json(result);
  } catch (err: unknown) {
    return handleReviewControllerError(res, err, "List reviews failed");
  }
};
