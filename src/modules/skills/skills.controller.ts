import type { Request, Response } from "express";
import { sendError } from "../../common/utils/httpError.js";
import { SkillError } from "./skills.errors.js";
import { createSkillSchema, listSkillsQuerySchema } from "./skills.schema.js";
import { createSkill, listSkills } from "./skills.service.js";

const getUserId = (req: Request) => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId)) {
    return null;
  }
  return userId;
};

const handleSkillControllerError = (
  res: Response,
  err: unknown,
  fallback: string,
) => {
  if (err instanceof SkillError) {
    return sendError(res, err.statusCode, err.message);
  }

  if (err instanceof Error && err.name === "ZodError") {
    return sendError(res, 400, "Invalid request data");
  }

  const message = err instanceof Error ? err.message : fallback;
  return sendError(res, 400, message);
};

export const listSkillsController = async (req: Request, res: Response) => {
  try {
    const query = listSkillsQuerySchema.parse(req.query);
    const skills = await listSkills(query);

    return res.json({ skills });
  } catch (err: unknown) {
    return handleSkillControllerError(res, err, "List skills failed");
  }
};

export const createSkillController = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return sendError(res, 401, "Unauthorized");
    }

    const data = createSkillSchema.parse(req.body);
    const skill = await createSkill(data);

    return res.status(201).json({ skill });
  } catch (err: unknown) {
    return handleSkillControllerError(res, err, "Create skill failed");
  }
};
