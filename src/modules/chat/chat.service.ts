import { prisma } from "../../lib/prisma.js";
import { ChatError } from "./chat.errors.js";
import { assertConversationParticipant } from "./chat.guard.js";
import {
  conversationInclude,
  lastMessageInclude,
  toConversationResponse,
  unreadCountSelect,
} from "./chat.mapper.js";
import type { CreateConversationInput, ListConversationsQuery } from "./chat.schema.js";

const buildConversationCursorFilter = async (cursor?: string) => {
  if (!cursor) {
    return {};
  }

  const cursorConversation = await prisma.conversation.findUnique({
    where: { id: cursor },
    select: { id: true, updatedAt: true },
  });

  if (!cursorConversation) {
    return {};
  }

  return {
    OR: [
      { updatedAt: { lt: cursorConversation.updatedAt } },
      {
        AND: [
          { updatedAt: cursorConversation.updatedAt },
          { id: { lt: cursorConversation.id } },
        ],
      },
    ],
  };
};

export const createOrGetConversation = async (
  callerId: number,
  input: CreateConversationInput,
) => {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
  });

  if (!post) {
    throw new ChatError("Post not found", 404);
  }

  let targetRecipientId: number;

  if (callerId === post.user_id) {
    if (!input.recipientId) {
      throw new ChatError("You must provide recipientId", 400);
    }

    const recipient = await prisma.user.findUnique({
      where: { id: input.recipientId },
    });

    if (!recipient) {
      throw new ChatError("Recipient not found", 404);
    }

    targetRecipientId = input.recipientId;
  } else {
    targetRecipientId = post.user_id;
  }

  if (callerId === targetRecipientId) {
    throw new ChatError("You can't create conversation with yourself", 400);
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      postId: post.id,
      AND: [
        { participants: { some: { userId: callerId } } },
        { participants: { some: { userId: targetRecipientId } } },
      ],
    },
    include: {
      ...conversationInclude,
      ...lastMessageInclude,
      _count: unreadCountSelect(callerId),
    },
  });

  if (existingConversation) {
    return {
      conversation: toConversationResponse(existingConversation, callerId),
      isNew: false,
    };
  }

  const createdConversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: { postId: post.id },
    });

    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: created.id, userId: callerId },
        { conversationId: created.id, userId: targetRecipientId },
      ],
    });

    return tx.conversation.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        ...conversationInclude,
        ...lastMessageInclude,
        _count: unreadCountSelect(callerId),
      },
    });
  });

  return {
    conversation: toConversationResponse(createdConversation, callerId),
    isNew: true,
  };
};

export const listConversations = async (
  callerId: number,
  query: ListConversationsQuery,
) => {
  const limit = query.limit ?? 20;
  const cursorFilter = await buildConversationCursorFilter(query.cursor);

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: callerId } },
      ...cursorFilter,
    },
    include: {
      ...conversationInclude,
      ...lastMessageInclude,
      _count: unreadCountSelect(callerId),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = conversations.length > limit;
  const page = hasMore ? conversations.slice(0, limit) : conversations;

  return {
    conversations: page.map((conversation) =>
      toConversationResponse(conversation, callerId),
    ),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
};

export const getConversationById = async (
  callerId: number,
  conversationId: string,
) => {
  await assertConversationParticipant(conversationId, callerId);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      ...conversationInclude,
      ...lastMessageInclude,
      _count: unreadCountSelect(callerId),
    },
  });

  return toConversationResponse(conversation, callerId);
};
