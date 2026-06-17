import type { Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { sendError } from "../../common/utils/httpError.js";
import { getUserId } from "../chat/chat.utils.js";
import { WalletError } from "./wallet.errors.js";
import { listWalletHistoryQuerySchema } from "./wallet.schema.js";
import { listWalletHistory } from "./wallet.service.js";

const handleWalletControllerError = (
  res: Response,
  err: unknown,
  fallback: string,
) => {
  if (err instanceof WalletError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof Error && err.name === "ZodError") {
    return sendError(res, 400, "Invalid request data");
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return sendError(res, 500, "Internal server error");
  }

  if (err instanceof Error) {
    return sendError(res, 500, fallback);
  }

  return sendError(res, 500, "Internal server error");
};

export const listWalletHistoryController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const query = listWalletHistoryQuerySchema.parse(req.query);
    const result = await listWalletHistory(userId, query);
    return res.json(result);
  } catch (err: unknown) {
    return handleWalletControllerError(res, err, "List wallet history failed");
  }
};
