import { prisma } from "../../lib/prisma.js";
import { ChatError } from "./chat.errors.js";

export const assertConversationParticipant = async (
  conversationId: string,
  userId: number,
) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
    },
    include: {
      conversation: { select: { id: true } },
    },
  });

  if (!participant) {
    const conversationExists = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversationExists) {
      throw new ChatError("Conversation not found", 404);
    }

    throw new ChatError("You do not have access to this resource", 403);
  }

  return participant;
};
