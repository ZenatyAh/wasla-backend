import { prisma } from "../../lib/prisma.js";
import type { NormalizedWalletType } from "./wallet.schema.js";

const userSelect = {
  id: true,
  full_name: true,
} as const;

const exchangeInclude = {
  post: { select: { id: true, title: true } },
  provider: { select: userSelect },
  consumer: { select: userSelect },
} as const;

const buildDateFilter = (startDate?: Date, endDate?: Date) => {
  if (!startDate && !endDate) {
    return undefined;
  }

  const created_at: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    created_at.gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    created_at.lte = end;
  }

  return { created_at };
};

const buildTypeFilter = (userId: number, type?: NormalizedWalletType) => {
  if (type === "credit") {
    return { receiver_id: userId };
  }
  if (type === "debit") {
    return { sender_id: userId };
  }
  return {
    OR: [{ receiver_id: userId }, { sender_id: userId }],
  };
};

export const findTransactionsForUser = async (
  userId: number,
  options: {
    type?: NormalizedWalletType;
    startDate?: Date;
    endDate?: Date;
  } = {},
) => {
  const typeFilter = buildTypeFilter(userId, options.type);
  const dateFilter = buildDateFilter(options.startDate, options.endDate);

  return prisma.transaction.findMany({
    where: {
      ...typeFilter,
      ...(dateFilter ? dateFilter : {}),
    },
    include: {
      sender: { select: userSelect },
      receiver: { select: userSelect },
    },
    orderBy: { created_at: "desc" },
  });
};

export const findWelcomeBonus = async (userId: number) =>
  prisma.transaction.findFirst({
    where: {
      receiver_id: userId,
      transaction_type: "WELCOME_BONUS",
    },
    include: {
      sender: { select: userSelect },
      receiver: { select: userSelect },
    },
  });

export const findUserCreatedAt = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { created_at: true },
  });
  return user?.created_at ?? null;
};

export const findExchangesWithPosts = async (exchangeIds: number[]) => {
  if (exchangeIds.length === 0) {
    return new Map<number, { id: number; post: { id: number; title: string } | null }>();
  }

  const exchanges = await prisma.serviceExchange.findMany({
    where: { id: { in: exchangeIds } },
    select: {
      id: true,
      post: { select: { id: true, title: true } },
    },
  });

  return new Map(exchanges.map((exchange) => [exchange.id, exchange]));
};

export const findPendingEscrowExchanges = async (userId: number) =>
  prisma.serviceExchange.findMany({
    where: {
      OR: [{ consumer_id: userId }, { provider_id: userId }],
      escrow_status: "HELD",
      status: { in: ["IN_PROGRESS", "WAITING_CONFIRMATION"] },
    },
    include: exchangeInclude,
    orderBy: { created_at: "desc" },
  });

export const findCancelledExchangesWithoutLedger = async (userId: number) => {
  const exchanges = await prisma.serviceExchange.findMany({
    where: {
      consumer_id: userId,
      status: { in: ["CANCELED", "REJECTED"] },
    },
    include: exchangeInclude,
    orderBy: { updated_at: "desc" },
  });

  if (exchanges.length === 0) {
    return [];
  }

  const exchangeIds = exchanges.map((exchange) => exchange.id);
  const ledgerRows = await prisma.transaction.findMany({
    where: {
      reference_contract_id: { in: exchangeIds },
      transaction_type: { in: ["TRANSFER", "REFUND"] },
    },
    select: { reference_contract_id: true },
  });

  const ledgerExchangeIds = new Set(
    ledgerRows
      .map((row) => row.reference_contract_id)
      .filter((id): id is number => id != null),
  );

  return exchanges.filter((exchange) => !ledgerExchangeIds.has(exchange.id));
};
