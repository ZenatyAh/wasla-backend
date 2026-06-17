import {
  mapCancelledExchangeToHistoryItem,
  mapPendingExchangeToHistoryItem,
  mapTransactionToHistoryItem,
  mapWelcomeBonusSynthetic,
  type WalletHistoryItem,
} from "./wallet.mapper.js";
import {
  findCancelledExchangesWithoutLedger,
  findExchangesWithPosts,
  findPendingEscrowExchanges,
  findTransactionsForUser,
  findUserCreatedAt,
  findWelcomeBonus,
} from "./wallet.repository.js";
import {
  normalizeWalletType,
  type ListWalletHistoryQuery,
} from "./wallet.schema.js";

const isWithinDateRange = (
  timestamp: Date,
  startDate?: Date,
  endDate?: Date,
) => {
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (timestamp < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (timestamp > end) {
      return false;
    }
  }

  return true;
};

const applyFilters = (
  items: WalletHistoryItem[],
  query: ListWalletHistoryQuery,
) => {
  const normalizedType = normalizeWalletType(query.type);

  return items.filter((item) => {
    if (normalizedType && item.type !== normalizedType) {
      return false;
    }
    if (query.status && item.status !== query.status) {
      return false;
    }
    if (!isWithinDateRange(item.timestamp, query.startDate, query.endDate)) {
      return false;
    }
    return true;
  });
};

const paginateItems = (
  items: WalletHistoryItem[],
  page: number,
  limit: number,
) => {
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit).map((item) => ({
    ...item,
    timestamp: item.timestamp.toISOString(),
  }));

  return {
    success: true as const,
    metadata: {
      totalItems,
      totalPages,
      currentPage: page,
      limit,
    },
    data,
  };
};

export const listWalletHistory = async (
  userId: number,
  query: ListWalletHistoryQuery,
) => {
  const normalizedType = normalizeWalletType(query.type);
  const includeCompleted = !query.status || query.status === "completed";
  const includePending = !query.status || query.status === "pending";
  const includeCancelled = !query.status || query.status === "cancelled";

  const items: WalletHistoryItem[] = [];

  if (includeCompleted) {
    const [transactions, welcomeBonus, userCreatedAt] = await Promise.all([
      findTransactionsForUser(userId, {
        type: normalizedType,
        startDate: query.startDate,
        endDate: query.endDate,
      }),
      findWelcomeBonus(userId),
      findUserCreatedAt(userId),
    ]);

    const exchangeIds = transactions
      .map((transaction) => transaction.reference_contract_id)
      .filter((id): id is number => id != null);
    const exchangeMap = await findExchangesWithPosts(exchangeIds);

    for (const transaction of transactions) {
      const exchange = transaction.reference_contract_id
        ? exchangeMap.get(transaction.reference_contract_id)
        : undefined;
      items.push(
        mapTransactionToHistoryItem(transaction, userId, exchange),
      );
    }

    if (
      !welcomeBonus &&
      userCreatedAt &&
      (!normalizedType || normalizedType === "credit")
    ) {
      const synthetic = mapWelcomeBonusSynthetic(userId, userCreatedAt);
      if (isWithinDateRange(synthetic.timestamp, query.startDate, query.endDate)) {
        items.push(synthetic);
      }
    }
  }

  if (includePending && (!normalizedType || normalizedType === "credit" || normalizedType === "debit")) {
    const pendingExchanges = await findPendingEscrowExchanges(userId);
    for (const exchange of pendingExchanges) {
      const item = mapPendingExchangeToHistoryItem(exchange, userId);
      if (isWithinDateRange(item.timestamp, query.startDate, query.endDate)) {
        items.push(item);
      }
    }
  }

  if (includeCancelled && (!normalizedType || normalizedType === "debit")) {
    const cancelledExchanges = await findCancelledExchangesWithoutLedger(userId);
    for (const exchange of cancelledExchanges) {
      const item = mapCancelledExchangeToHistoryItem(exchange);
      if (isWithinDateRange(item.timestamp, query.startDate, query.endDate)) {
        items.push(item);
      }
    }
  }

  const filtered = applyFilters(items, query);
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return paginateItems(filtered, query.page, query.limit);
};
