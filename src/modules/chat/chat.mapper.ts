import type { Prisma } from "../../generated/prisma/client.js";

export const conversationInclude = {
  post: { select: { id: true, title: true } },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          full_name: true,
          profile_image: true,
        },
      },
    },
  },
} as const;

export const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  readReceipts: {
    select: {
      id: true,
      messageId: true,
      userId: true,
      readAt: true,
    },
  },
} as const;

type ConversationRecord = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

type MessageRecord = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

type ConversationWithMeta = ConversationRecord & {
  _count?: { messages: number };
  messages?: MessageRecord[];
};

export const toMessageResponse = (message: MessageRecord) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  sender: message.sender,
  body: message.deletedAt ? null : message.body,
  createdAt: message.createdAt,
  editedAt: message.editedAt,
  deletedAt: message.deletedAt,
  readBy: message.readReceipts,
});

export const toConversationResponse = (
  conversation: ConversationWithMeta,
  callerId: number,
) => {
  const lastMessage = conversation.messages?.[0];

  return {
    id: conversation.id,
    postId: conversation.postId,
    post: conversation.post,
    participants: conversation.participants.map((participant) => ({
      userId: participant.userId,
      joinedAt: participant.joinedAt,
      user: participant.user,
    })),
    lastMessage: lastMessage ? toMessageResponse(lastMessage) : null,
    unreadCount: conversation._count?.messages ?? 0,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};

export const unreadCountSelect = (callerId: number) => ({
  select: {
    messages: {
      where: {
        senderId: { not: callerId },
        deletedAt: null,
        readReceipts: { none: { userId: callerId } },
      },
    },
  },
});

export const lastMessageInclude = {
  messages: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: messageInclude,
  },
};
