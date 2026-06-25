import type { Request, Response } from "express";
import { getErrorMessage, sendError } from "../../common/utils/httpError.js";
import { ExchangeError } from "./exchanges.errors.js";
import {
  acceptExchange,
  cancelExchange,
  confirmExchange,
  deliverExchange,
  disputeExchange,
  getExchangeById,
  listExchanges,
  rejectExchange,
  requestExchange,
  recordWorkSession,
  confirmWorkSession,
  rejectWorkSession,
  listWorkSessions,
} from "./exchanges.service.js";
import {
  exchangeIdParamSchema,
  listExchangesQuerySchema,
  createSessionSchema,
  sessionIdParamSchema,
  type CreateExchangeInput,
} from "./exchanges.schema.js";

const getUserId = (req: Request) => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId)) {
    return null;
  }
  return userId;
};

const handleError = (res: Response, err: unknown, fallback: string) => {
  if (err instanceof ExchangeError) {
    return sendError(res, err.statusCode, err.message);
  }
  return sendError(res, 400, getErrorMessage(err, fallback));
};

export const createExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const data: CreateExchangeInput = req.body;
    const exchange = await requestExchange(userId, data);
    return res.status(201).json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Create exchange failed");
  }
};

export const acceptExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await acceptExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Accept exchange failed");
  }
};

export const rejectExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await rejectExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Reject exchange failed");
  }
};

export const deliverExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await deliverExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Deliver exchange failed");
  }
};

export const confirmExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await confirmExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Confirm exchange failed");
  }
};

export const cancelExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await cancelExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Cancel exchange failed");
  }
};

export const disputeExchangeController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await disputeExchange(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Dispute exchange failed");
  }
};

export const listExchangesController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const query = listExchangesQuerySchema.parse(req.query);
    const result = await listExchanges(userId, query);
    return res.json(result);
  } catch (err: unknown) {
    return handleError(res, err, "List exchanges failed");
  }
};

export const getExchangeByIdController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const id = exchangeIdParamSchema.parse(req.params.id);
    const exchange = await getExchangeById(id, userId);
    return res.json({ exchange });
  } catch (err: unknown) {
    return handleError(res, err, "Fetch exchange failed");
  }
};

export const recordSessionController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const id = exchangeIdParamSchema.parse(req.params.id);
    const data = createSessionSchema.parse(req.body);
    const session = await recordWorkSession(id, userId, data);
    return res.status(201).json({ session });
  } catch (err: unknown) {
    return handleError(res, err, "Record session failed");
  }
};

export const confirmSessionController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const id = exchangeIdParamSchema.parse(req.params.id);
    const sessionId = sessionIdParamSchema.parse(req.params.sessionId);
    const session = await confirmWorkSession(id, sessionId, userId);
    return res.json({ session });
  } catch (err: unknown) {
    return handleError(res, err, "Confirm session failed");
  }
};

export const rejectSessionController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const id = exchangeIdParamSchema.parse(req.params.id);
    const sessionId = sessionIdParamSchema.parse(req.params.sessionId);
    const session = await rejectWorkSession(id, sessionId, userId);
    return res.json({ session });
  } catch (err: unknown) {
    return handleError(res, err, "Reject session failed");
  }
};

export const listSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");

    const id = exchangeIdParamSchema.parse(req.params.id);
    const sessions = await listWorkSessions(id, userId);
    return res.json({ sessions });
  } catch (err: unknown) {
    return handleError(res, err, "List sessions failed");
  }
};
