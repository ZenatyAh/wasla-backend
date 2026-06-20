import { prisma } from "../../lib/prisma.js";
import { ChatError } from "./chat.errors.js";
import { assertConversationParticipant } from "./chat.guard.js";
import {
  conversationInclude,
  lastMessageInclude,
  toConversationResponse,
  unreadCountSelect,
} from "./chat.mapper.js";
import type {
  CreateConversationInput,
  CreateDirectConversationInput,
  ListConversationsQuery,
} from "./chat.schema.js";

const isUniqueConstraintError = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code: string }).code === "P2002";

export const buildDirectConversationKey = (userA: number, userB: number) => {
  const [low, high] = userA < userB ? [userA, userB] : [userB, userA];
  return `${low}:${high}`;
};

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

const conversationDetailsInclude = (callerId: number) => ({
  ...conversationInclude,
  ...lastMessageInclude,
  _count: unreadCountSelect(callerId),
});

const loadConversationDetails = async (conversationId: string, callerId: number) =>
  prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: conversationDetailsInclude(callerId),
  });

const createConversationWithParticipants = async (
  callerId: number,
  targetRecipientId: number,
  data: { postId?: number | null; directKey?: string | null },
) => {
  const conversationId = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        postId: data.postId ?? null,
        directKey: data.directKey ?? null,
      },
    });

    await tx.conversationParticipant.createMany({
      data: [
        { conversationId: created.id, userId: callerId },
        { conversationId: created.id, userId: targetRecipientId },
      ],
    });

    return created.id;
  });

  return loadConversationDetails(conversationId, callerId);
};

const assertDistinctParticipants = (callerId: number, targetRecipientId: number) => {
  if (callerId === targetRecipientId) {
    throw new ChatError("You can't create conversation with yourself", 400);
  }
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
      select: { id: true, deleted_at: true },
    });

    if (!recipient || recipient.deleted_at) {
      throw new ChatError("Recipient not found", 404);
    }

    targetRecipientId = input.recipientId;
  } else {
    targetRecipientId = post.user_id;
  }

  assertDistinctParticipants(callerId, targetRecipientId);

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      postId: post.id,
      AND: [
        { participants: { some: { userId: callerId } } },
        { participants: { some: { userId: targetRecipientId } } },
      ],
    },
    include: conversationDetailsInclude(callerId),
  });

  if (existingConversation) {
    return {
      conversation: toConversationResponse(existingConversation, callerId),
      isNew: false,
    };
  }

  const createdConversation = await createConversationWithParticipants(
    callerId,
    targetRecipientId,
    { postId: post.id },
  );

  return {
    conversation: toConversationResponse(createdConversation, callerId),
    isNew: true,
  };
};

export const createOrGetDirectConversation = async (
  callerId: number,
  input: CreateDirectConversationInput,
) => {
  assertDistinctParticipants(callerId, input.recipientId);

  const recipient = await prisma.user.findUnique({
    where: { id: input.recipientId },
    select: { id: true, deleted_at: true },
  });

  if (!recipient || recipient.deleted_at) {
    throw new ChatError("Recipient not found", 404);
  }

  const directKey = buildDirectConversationKey(callerId, input.recipientId);

  const existingConversation = await prisma.conversation.findUnique({
    where: { directKey },
    include: conversationDetailsInclude(callerId),
  });

  if (existingConversation) {
    return {
      conversation: toConversationResponse(existingConversation, callerId),
      isNew: false,
    };
  }

  try {
    const createdConversation = await createConversationWithParticipants(
      callerId,
      input.recipientId,
      { directKey },
    );

    return {
      conversation: toConversationResponse(createdConversation, callerId),
      isNew: true,
    };
  } catch (err: unknown) {
    if (!isUniqueConstraintError(err)) {
      throw err;
    }

    const racedConversation = await prisma.conversation.findUnique({
      where: { directKey },
      include: conversationDetailsInclude(callerId),
    });

    if (!racedConversation) {
      throw err;
    }

    return {
      conversation: toConversationResponse(racedConversation, callerId),
      isNew: false,
    };
  }
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
    include: conversationDetailsInclude(callerId),
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

  const conversation = await loadConversationDetails(conversationId, callerId);

  return toConversationResponse(conversation, callerId);
};
