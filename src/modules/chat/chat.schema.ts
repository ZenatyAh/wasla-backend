import { z } from "zod";

export const createConversationSchema = z.object({
  postId: z.coerce.number().int().positive(),
  recipientId: z.coerce.number().int().positive().optional(),
});

export const listConversationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  clientMessageId: z.string().uuid(),
});

export const batchMessageStatusSchema = z.object({
  conversationId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

export const editMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const listMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(30),
});

export const messageIdParamSchema = z.object({
  messageId: z.string().min(1),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type BatchMessageStatusInput = z.infer<typeof batchMessageStatusSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
