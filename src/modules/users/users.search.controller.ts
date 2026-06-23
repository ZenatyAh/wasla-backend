import type { Request, Response } from "express";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { getUserId } from "../chat/chat.utils.js";
import { searchUsersService } from "./users.search.service.js";

export const searchUsersController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const result = await searchUsersService(req.body);
    return res.json(result);
  } catch (err: unknown) {
    return sendError(res, 500, getErrorMessage(err, "Search users failed"));
  }
};
