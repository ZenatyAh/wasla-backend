import type { TransactionType } from "../../generated/prisma/client.js";

export type WalletHistoryItem = {
  transactionId: string;
  amount: number;
  type: "credit" | "debit";
  counterparty: {
    id: string;
    name: string;
  };
  relatedServiceOrRequest: {
    id: string;
    title: string;
  } | null;
  status: "completed" | "refunded" | "held" | "disputed" | "cancelled";
  timestamp: Date;
};

type UserSummary = {
  id: number;
  full_name: string;
};

type TransactionRecord = {
  id: number;
  receiver_id: number;
  sender_id: number | null;
  amount: number;
  transaction_type: TransactionType;
  reference_contract_id: number | null;
  created_at: Date;
  sender: UserSummary | null;
  receiver: UserSummary;
};

type ExchangeWithPost = {
  id: number;
  post: { id: number; title: string } | null;
};

const SYSTEM_COUNTERPARTY = {
  id: "system",
  name: "Wasla",
} as const;

const WELCOME_RELATED = {
  id: "welcome",
  title: "Welcome bonus",
} as const;

export const mapWelcomeBonusSynthetic = (
  userId: number,
  createdAt: Date,
): WalletHistoryItem => ({
  transactionId: `welcome-${userId}`,
  amount: 5,
  type: "credit",
  counterparty: SYSTEM_COUNTERPARTY,
  relatedServiceOrRequest: WELCOME_RELATED,
  status: "completed",
  timestamp: createdAt,
});

export const mapTransactionToHistoryItem = (
  transaction: TransactionRecord,
  userId: number,
  exchange?: ExchangeWithPost,
): WalletHistoryItem => {
  const isCredit = transaction.receiver_id === userId;
  const counterpartyUser = isCredit ? transaction.sender : transaction.receiver;

  let relatedServiceOrRequest: WalletHistoryItem["relatedServiceOrRequest"] = null;
  if (transaction.transaction_type === "WELCOME_BONUS") {
    relatedServiceOrRequest = WELCOME_RELATED;
  } else if (exchange?.post) {
    relatedServiceOrRequest = {
      id: String(exchange.post.id),
      title: exchange.post.title,
    };
  } else if (exchange) {
    relatedServiceOrRequest = {
      id: String(exchange.id),
      title: "Service exchange",
    };
  }

  return {
    transactionId: String(transaction.id),
    amount: transaction.amount,
    type: isCredit ? "credit" : "debit",
    counterparty:
      transaction.transaction_type === "WELCOME_BONUS"
        ? SYSTEM_COUNTERPARTY
        : {
            id: String(counterpartyUser?.id ?? "unknown"),
            name: counterpartyUser?.full_name ?? "Unknown",
          },
    relatedServiceOrRequest,
    status: transaction.transaction_type === "REFUND" ? "refunded" : "completed",
    timestamp: transaction.created_at,
  };
};

type PendingExchangeRecord = {
  id: number;
  consumer_id: number;
  provider_id: number;
  time_credits: number;
  created_at: Date;
  status: string;
  post: { id: number; title: string } | null;
  provider: UserSummary;
  consumer: UserSummary;
};

export const mapPendingExchangeToHistoryItem = (
  exchange: PendingExchangeRecord,
  userId: number,
): WalletHistoryItem => {
  const isConsumer = exchange.consumer_id === userId;
  const counterparty = isConsumer ? exchange.provider : exchange.consumer;

  return {
    transactionId: `exchange-pending-${exchange.id}`,
    amount: exchange.time_credits,
    type: isConsumer ? "debit" : "credit",
    counterparty: {
      id: String(counterparty.id),
      name: counterparty.full_name,
    },
    relatedServiceOrRequest: exchange.post
      ? { id: String(exchange.post.id), title: exchange.post.title }
      : { id: String(exchange.id), title: "Service exchange" },
    status: exchange.status === "DISPUTED" ? "disputed" : "held",
    timestamp: exchange.created_at,
  };
};

type CancelledExchangeRecord = PendingExchangeRecord & {
  canceled_at: Date | null;
  updated_at: Date;
};

export const mapCancelledExchangeToHistoryItem = (
  exchange: CancelledExchangeRecord,
): WalletHistoryItem => ({
  transactionId: `exchange-cancelled-${exchange.id}`,
  amount: exchange.time_credits,
  type: "debit",
  counterparty: {
    id: String(exchange.provider.id),
    name: exchange.provider.full_name,
  },
  relatedServiceOrRequest: exchange.post
    ? { id: String(exchange.post.id), title: exchange.post.title }
    : { id: String(exchange.id), title: "Service exchange" },
  status: "cancelled",
  timestamp: exchange.canceled_at ?? exchange.updated_at,
});
