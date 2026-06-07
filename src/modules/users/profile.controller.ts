import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import { getUserId, handleChatControllerError } from "../chat/chat.utils.js";
import {
  updateProfileSchema,
  userIdParamSchema,
} from "./profile.schema.js";
import { getUserProfile, updateUserProfile } from "./profile.service.js";

export const getProfileController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const { id } = userIdParamSchema.parse(req.params);
    const result = await getUserProfile(id);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Get profile failed");
  }
};

export const updateProfileController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const data = updateProfileSchema.parse(req.body);
    const result = await updateUserProfile(userId, data);

    return res.json(result);
  } catch (err: unknown) {
    return handleChatControllerError(res, err, "Update profile failed");
  }
};
