import { prisma } from "../../lib/prisma.js";
import { ChatError } from "./chat.errors.js";

export const assertConversationParticipant = async (
  conversationId: string,
  userId: number,
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });

  if (!conversation) {
    throw new ChatError("Conversation not found", 404);
  }

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!participant) {
    throw new ChatError("You do not have access to this resource", 403);
  }

  return participant;
};
