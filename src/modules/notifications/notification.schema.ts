import { z } from "zod";

export const notificationIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
