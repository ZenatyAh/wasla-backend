import { prisma } from "../../lib/prisma.js";
import { syncInteraction } from "../recommender/recommender.client.js";
import { createContractNotification } from "../notifications/notification.service.js";
import { ExchangeError } from "./exchanges.errors.js";
import type { CreateExchangeInput, ListExchangesQuery, CreateSessionInput, DeadlineExtensionInput } from "./exchanges.schema.js";

const exchangeSelect = {
  id: true,
  post_id: true,
  provider_id: true,
  consumer_id: true,
  time_credits: true,
  status: true,
  escrow_status: true,
  maximum_end_date: true,
  proposed_end_date: true,
  accepted_at: true,
  delivered_at: true,
  completed_at: true,
  canceled_at: true,
  created_at: true,
  updated_at: true,
  provider: {
    select: { id: true, username: true, full_name: true, profile_image: true },
  },
  consumer: {
    select: { id: true, username: true, full_name: true, profile_image: true },
  },
  post: {
    select: { id: true, title: true, category: true, service_mode: true },
  },
} as const;

type ExchangeParticipant = {
  id: number;
  username: string;
  full_name: string;
  profile_image: string | null;
};

type ExchangeRecord = {
  id: number;
  post_id: number | null;
  provider_id: number;
  consumer_id: number;
  time_credits: number;
  status: string;
  escrow_status: string;
  maximum_end_date: Date;
  proposed_end_date: Date | null;
  accepted_at: Date | null;
  delivered_at: Date | null;
  completed_at: Date | null;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  provider: ExchangeParticipant;
  consumer: ExchangeParticipant;
  post: {
    id: number;
    title: string;
    category: string;
    service_mode: string;
  } | null;
};

const toExchangeResponse = (exchange: ExchangeRecord) => ({
  id: exchange.id,
  postId: exchange.post_id,
  requesterId: exchange.consumer_id,
  providerId: exchange.provider_id,
  duration: exchange.time_credits,
  contractEndDate: exchange.maximum_end_date,
  proposedEndDate: exchange.proposed_end_date,
  status: exchange.status,
  escrowStatus: exchange.escrow_status,
  acceptedAt: exchange.accepted_at,
  deliveredAt: exchange.delivered_at,
  completedAt: exchange.completed_at,
  canceledAt: exchange.canceled_at,
  createdAt: exchange.created_at,
  updatedAt: exchange.updated_at,
  requester: exchange.consumer,
  provider: exchange.provider,
  post: exchange.post,
});

/**
 * Runs a callback in a Serializable transaction, retrying a few times on
 * Postgres serialization failures (Prisma error code P2034) so that genuine
 * concurrent balance changes are resolved deterministically.
 */
const runSerializable = async <T>(
  fn: Parameters<typeof prisma.$transaction>[0],
): Promise<T> => {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return (await prisma.$transaction(fn, {
        isolationLevel: "Serializable",
      })) as T;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2034"
      ) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

const findExchangeOrThrow = async (id: number) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id },
    select: exchangeSelect,
  });
  if (!exchange) {
    throw new ExchangeError("Exchange not found", 404);
  }
  return exchange as ExchangeRecord;
};

const fetchExchange = (id: number) =>
  prisma.serviceExchange
    .findUniqueOrThrow({ where: { id }, select: exchangeSelect })
    .then((exchange) => toExchangeResponse(exchange as ExchangeRecord));

export const requestExchange = async (
  requesterId: number,
  data: CreateExchangeInput,
) => {
  if (data.providerId === requesterId) {
    throw new ExchangeError("You cannot request a service from yourself", 400);
  }

  const post = await prisma.post.findUnique({
    where: { id: data.postId },
    select: { id: true, status: true },
  });
  if (!post) {
    throw new ExchangeError("Post not found", 404);
  }

  const provider = await prisma.user.findUnique({
    where: { id: data.providerId },
    select: { id: true },
  });
  if (!provider) {
    throw new ExchangeError("Provider not found", 404);
  }

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { available_balance: true },
  });
  if (!requester) {
    throw new ExchangeError("Requester not found", 404);
  }
  if (requester.available_balance < data.duration) {
    throw new ExchangeError("Insufficient time credits", 400);
  }

  const exchange = await prisma.serviceExchange.create({
    data: {
      post_id: data.postId,
      provider_id: data.providerId,
      consumer_id: requesterId,
      time_credits: data.duration,
      maximum_end_date: data.contractEndDate,
      status: "PENDING",
      escrow_status: "NONE",
    },
    select: exchangeSelect,
  });

  syncInteraction({
    userId: requesterId,
    postId: data.postId,
    action: "apply",
  });

  await createContractNotification({
    recipientId: data.providerId,
    type: "EXCHANGE_REQUESTED",
    title: "طلب خدمة جديد",
    body: "هناك شخص يطلب إحدى خدماتك، يرجى مراجعة الطلب.",
    contractId: exchange.id,
  }).catch((err) => console.error("Notification failed", err));

  return toExchangeResponse(exchange as ExchangeRecord);
};

export const acceptExchange = async (id: number, providerId: number) => {
  await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id },
      select: {
        id: true,
        provider_id: true,
        consumer_id: true,
        time_credits: true,
        status: true,
      },
    });
    if (!exchange) {
      throw new ExchangeError("Exchange not found", 404);
    }
    if (exchange.provider_id !== providerId) {
      throw new ExchangeError("Only the provider can accept this exchange", 403);
    }
    if (exchange.status !== "PENDING") {
      throw new ExchangeError("Exchange is not pending", 400);
    }

    // Atomic, race-safe escrow hold: only succeeds if the requester still has
    // enough available credits at the moment of acceptance.
    const held = await tx.user.updateMany({
      where: {
        id: exchange.consumer_id,
        available_balance: { gte: exchange.time_credits },
      },
      data: {
        available_balance: { decrement: exchange.time_credits },
        escrow_balance: { increment: exchange.time_credits },
      },
    });
    if (held.count === 0) {
      throw new ExchangeError(
        "Requester no longer has enough time credits",
        400,
      );
    }

    const updated = await tx.serviceExchange.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "IN_PROGRESS",
        escrow_status: "HELD",
        accepted_at: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new ExchangeError("Exchange is no longer pending", 409);
    }
  });

  const result = await fetchExchange(id);

  await createContractNotification({
    recipientId: result.requesterId,
    type: "EXCHANGE_ACCEPTED",
    title: "تم قبول طلبك",
    body: "تم قبول طلب الخدمة الخاص بك، وهو الآن قيد التنفيذ.",
    contractId: result.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const rejectExchange = async (id: number, providerId: number) => {
  await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id },
      select: { id: true, provider_id: true, status: true },
    });
    if (!exchange) {
      throw new ExchangeError("Exchange not found", 404);
    }
    if (exchange.provider_id !== providerId) {
      throw new ExchangeError("Only the provider can reject this exchange", 403);
    }
    if (exchange.status !== "PENDING") {
      throw new ExchangeError("Exchange is not pending", 400);
    }

    const updated = await tx.serviceExchange.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "REJECTED" },
    });
    if (updated.count === 0) {
      throw new ExchangeError("Exchange is no longer pending", 409);
    }
  });

  const result = await fetchExchange(id);

  await createContractNotification({
    recipientId: result.requesterId,
    type: "EXCHANGE_REJECTED",
    title: "تم رفض طلبك",
    body: "تم رفض طلب الخدمة الخاص بك.",
    contractId: result.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const deliverExchange = async (id: number, providerId: number) => {
  await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id },
      select: { id: true, provider_id: true, status: true },
    });
    if (!exchange) {
      throw new ExchangeError("Exchange not found", 404);
    }
    if (exchange.provider_id !== providerId) {
      throw new ExchangeError(
        "Only the provider can mark this exchange as delivered",
        403,
      );
    }
    if (exchange.status !== "IN_PROGRESS") {
      throw new ExchangeError("Exchange is not in progress", 400);
    }

    const updated = await tx.serviceExchange.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: { status: "WAITING_CONFIRMATION", delivered_at: new Date() },
    });
    if (updated.count === 0) {
      throw new ExchangeError("Exchange is no longer in progress", 409);
    }
  });

  return fetchExchange(id);
};

export const confirmExchange = async (id: number, requesterId: number) => {
  await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id },
      select: {
        id: true,
        provider_id: true,
        consumer_id: true,
        time_credits: true,
        status: true,
      },
    });
    if (!exchange) {
      throw new ExchangeError("Exchange not found", 404);
    }
    if (exchange.consumer_id !== requesterId) {
      throw new ExchangeError(
        "Only the requester can confirm this exchange",
        403,
      );
    }
    if (exchange.status !== "WAITING_CONFIRMATION") {
      throw new ExchangeError("Exchange is not awaiting confirmation", 400);
    }

    // Release escrow from the requester (guarded so escrow never goes negative).
    const released = await tx.user.updateMany({
      where: {
        id: exchange.consumer_id,
        escrow_balance: { gte: exchange.time_credits },
      },
      data: {
        escrow_balance: { decrement: exchange.time_credits },
        services_received: { increment: 1 },
      },
    });
    if (released.count === 0) {
      throw new ExchangeError("Escrowed credits are not available", 400);
    }

    await tx.user.update({
      where: { id: exchange.provider_id },
      data: {
        available_balance: { increment: exchange.time_credits },
        services_provided: { increment: 1 },
      },
    });

    await tx.transaction.create({
      data: {
        sender_id: exchange.consumer_id,
        receiver_id: exchange.provider_id,
        amount: exchange.time_credits,
        transaction_type: "TRANSFER",
        reference_contract_id: exchange.id,
      },
    });

    const completed = await tx.serviceExchange.updateMany({
      where: { id, status: "WAITING_CONFIRMATION" },
      data: {
        status: "COMPLETED",
        escrow_status: "RELEASED",
        completed_at: new Date(),
      },
    });
    if (completed.count === 0) {
      throw new ExchangeError("Exchange is no longer awaiting confirmation", 409);
    }
  });

  return fetchExchange(id);
};

export const cancelExchange = async (id: number, userId: number) => {
  await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id },
      select: {
        id: true,
        provider_id: true,
        consumer_id: true,
        time_credits: true,
        status: true,
      },
    });
    if (!exchange) {
      throw new ExchangeError("Exchange not found", 404);
    }

    const isProvider = exchange.provider_id === userId;
    const isRequester = exchange.consumer_id === userId;
    if (!isProvider && !isRequester) {
      throw new ExchangeError(
        "You are not a participant in this exchange",
        403,
      );
    }

    if (exchange.status === "PENDING") {
      const canceled = await tx.serviceExchange.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELED", canceled_at: new Date() },
      });
      if (canceled.count === 0) {
        throw new ExchangeError("Exchange is no longer pending", 409);
      }
      return;
    }

    if (
      exchange.status === "IN_PROGRESS" ||
      exchange.status === "WAITING_CONFIRMATION"
    ) {
      if (isProvider) {
        // Provider backs out -> refund the held credits to the requester.
        const refunded = await tx.user.updateMany({
          where: {
            id: exchange.consumer_id,
            escrow_balance: { gte: exchange.time_credits },
          },
          data: {
            escrow_balance: { decrement: exchange.time_credits },
            available_balance: { increment: exchange.time_credits },
          },
        });
        if (refunded.count === 0) {
          throw new ExchangeError("Escrowed credits are not available", 400);
        }

        await tx.transaction.create({
          data: {
            sender_id: exchange.provider_id,
            receiver_id: exchange.consumer_id,
            amount: exchange.time_credits,
            transaction_type: "REFUND",
            reference_contract_id: exchange.id,
          },
        });

        const canceled = await tx.serviceExchange.updateMany({
          where: { id, status: exchange.status },
          data: {
            status: "CANCELED",
            escrow_status: "REFUNDED",
            canceled_at: new Date(),
          },
        });
        if (canceled.count === 0) {
          throw new ExchangeError("Exchange state changed; please retry", 409);
        }
        return;
      }

      // Requester cannot unilaterally cancel an active exchange; escalate to a
      // dispute so credits stay frozen until it is resolved.
      const disputed = await tx.serviceExchange.updateMany({
        where: { id, status: exchange.status },
        data: { status: "DISPUTED" },
      });
      if (disputed.count === 0) {
        throw new ExchangeError("Exchange state changed; please retry", 409);
      }
      return;
    }

    throw new ExchangeError(
      `Exchange cannot be canceled from status ${exchange.status}`,
      400,
    );
  });

  const result = await fetchExchange(id);

  const recipientId = userId === result.providerId ? result.requesterId : result.providerId;
  await createContractNotification({
    recipientId,
    type: "EXCHANGE_CANCELED",
    title: "تم إلغاء الطلب",
    body: "تم إلغاء طلب الخدمة.",
    contractId: result.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const disputeExchange = async (id: number, userId: number) => {
  const exchange = await findExchangeOrThrow(id);

  const isParticipant =
    exchange.provider_id === userId || exchange.consumer_id === userId;
  if (!isParticipant) {
    throw new ExchangeError("You are not a participant in this exchange", 403);
  }
  if (
    exchange.status !== "IN_PROGRESS" &&
    exchange.status !== "WAITING_CONFIRMATION"
  ) {
    throw new ExchangeError(
      "Only active exchanges can be disputed",
      400,
    );
  }

  // Credits remain frozen in escrow until an admin resolves the dispute.
  await prisma.serviceExchange.update({
    where: { id },
    data: { status: "DISPUTED" },
  });

  return fetchExchange(id);
};

export const listExchanges = async (
  userId: number,
  query: ListExchangesQuery,
) => {
  const { role, status, page, limit } = query;

  const roleFilter =
    role === "provider"
      ? { provider_id: userId }
      : role === "requester"
        ? { consumer_id: userId }
        : { OR: [{ provider_id: userId }, { consumer_id: userId }] };

  const where = {
    ...roleFilter,
    ...(status ? { status } : {}),
  };

  const [total, exchanges] = await Promise.all([
    prisma.serviceExchange.count({ where }),
    prisma.serviceExchange.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: exchangeSelect,
    }),
  ]);

  return {
    data: (exchanges as ExchangeRecord[]).map(toExchangeResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getExchangeById = async (id: number, userId: number) => {
  const exchange = await findExchangeOrThrow(id);

  const isParticipant =
    exchange.provider_id === userId || exchange.consumer_id === userId;
  if (!isParticipant) {
    throw new ExchangeError("You are not a participant in this exchange", 403);
  }

  return toExchangeResponse(exchange);
};

export const recordWorkSession = async (
  contractId: number,
  providerId: number,
  data: CreateSessionInput,
) => {
  const result = await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id: contractId },
      select: { id: true, provider_id: true, status: true, time_credits: true, completed_hours: true },
    });

    if (!exchange) {
      throw new ExchangeError("Contract not found", 404);
    }
    if (exchange.provider_id !== providerId) {
      throw new ExchangeError("Only the provider can record a session", 403);
    }
    if (exchange.status !== "IN_PROGRESS" && exchange.status !== "WAITING_CONFIRMATION") {
      throw new ExchangeError("Contract is not active", 400);
    }

    const pendingSessions = await tx.workSession.findMany({
      where: { contract_id: contractId, status: "PENDING_CONFIRMATION" },
      select: { hours: true }
    });
    const pendingHours = pendingSessions.reduce((acc, s) => acc + s.hours, 0);

    if (exchange.completed_hours + pendingHours + data.hours > exchange.time_credits) {
      throw new ExchangeError("Total recorded hours cannot exceed agreed time credits", 400);
    }

    const lastSession = await tx.workSession.findFirst({
      where: { contract_id: contractId },
      orderBy: { session_number: "desc" },
      select: { session_number: true },
    });
    const nextSessionNumber = lastSession ? lastSession.session_number + 1 : 1;

    const session = await tx.workSession.create({
      data: {
        contract_id: contractId,
        session_number: nextSessionNumber,
        hours: data.hours,
        notes: data.notes,
        status: "PENDING_CONFIRMATION",
      },
    });
    return session;
  });

  const exchange = await prisma.serviceExchange.findUnique({ where: { id: contractId } });
  if (exchange) {
    await createContractNotification({
      recipientId: exchange.consumer_id,
      type: "SESSION_RECORDED",
      title: "تم تسجيل جلسة عمل جديدة",
      body: "قام مقدم الخدمة بتسجيل جلسة عمل جديدة، يرجى مراجعتها.",
      contractId: exchange.id,
    }).catch((err) => console.error("Notification failed", err));
  }

  return result;
};

export const confirmWorkSession = async (
  contractId: number,
  sessionId: number,
  requesterId: number,
) => {
  const result = await runSerializable(async (tx) => {
    const exchange = await tx.serviceExchange.findUnique({
      where: { id: contractId },
      select: { id: true, consumer_id: true, provider_id: true, time_credits: true, completed_hours: true, status: true },
    });

    if (!exchange) {
      throw new ExchangeError("Contract not found", 404);
    }
    if (exchange.consumer_id !== requesterId) {
      throw new ExchangeError("Only the requester can confirm sessions", 403);
    }

    const session = await tx.workSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.contract_id !== contractId) {
      throw new ExchangeError("Session not found", 404);
    }
    if (session.status !== "PENDING_CONFIRMATION") {
      throw new ExchangeError("Session is not pending confirmation", 400);
    }

    const updatedSession = await tx.workSession.update({
      where: { id: sessionId },
      data: { status: "CONFIRMED", confirmed_at: new Date() },
    });

    const newCompletedHours = exchange.completed_hours + session.hours;

    await tx.serviceExchange.update({
      where: { id: contractId },
      data: { completed_hours: newCompletedHours },
    });

    if (newCompletedHours === exchange.time_credits) {
      const released = await tx.user.updateMany({
        where: {
          id: exchange.consumer_id,
          escrow_balance: { gte: exchange.time_credits },
        },
        data: {
          escrow_balance: { decrement: exchange.time_credits },
          services_received: { increment: 1 },
        },
      });
      if (released.count === 0) {
        throw new ExchangeError("Escrowed credits are not available for auto-completion", 400);
      }

      await tx.user.update({
        where: { id: exchange.provider_id },
        data: {
          available_balance: { increment: exchange.time_credits },
          services_provided: { increment: 1 },
        },
      });

      await tx.transaction.create({
        data: {
          sender_id: exchange.consumer_id,
          receiver_id: exchange.provider_id,
          amount: exchange.time_credits,
          transaction_type: "TRANSFER",
          reference_contract_id: exchange.id,
        },
      });

      await tx.serviceExchange.update({
        where: { id: contractId },
        data: {
          status: "COMPLETED",
          escrow_status: "RELEASED",
          completed_at: new Date(),
        },
      });
    }

    return updatedSession;
  });

  const exchange = await prisma.serviceExchange.findUnique({ where: { id: contractId } });
  if (exchange) {
    await createContractNotification({
      recipientId: exchange.provider_id,
      type: "SESSION_CONFIRMED",
      title: "تم تأكيد جلسة العمل",
      body: "قام طالب الخدمة بتأكيد جلسة العمل الخاصة بك.",
      contractId: exchange.id,
    }).catch((err) => console.error("Notification failed", err));
  }

  return result;
};

export const rejectWorkSession = async (
  contractId: number,
  sessionId: number,
  requesterId: number,
) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: contractId },
    select: { id: true, consumer_id: true, provider_id: true },
  });

  if (!exchange) {
    throw new ExchangeError("Contract not found", 404);
  }
  if (exchange.consumer_id !== requesterId) {
    throw new ExchangeError("Only the requester can reject sessions", 403);
  }

  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.contract_id !== contractId) {
    throw new ExchangeError("Session not found", 404);
  }
  if (session.status !== "PENDING_CONFIRMATION") {
    throw new ExchangeError("Session is not pending confirmation", 400);
  }

  const result = await prisma.workSession.update({
    where: { id: sessionId },
    data: { status: "REJECTED" },
  });

  await createContractNotification({
    recipientId: exchange.provider_id,
    type: "SESSION_REJECTED",
    title: "تم رفض جلسة العمل",
    body: "قام طالب الخدمة برفض جلسة العمل الخاصة بك.",
    contractId: exchange.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const listWorkSessions = async (contractId: number, userId: number) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: contractId },
    select: { id: true, provider_id: true, consumer_id: true },
  });

  if (!exchange) {
    throw new ExchangeError("Contract not found", 404);
  }
  if (exchange.provider_id !== userId && exchange.consumer_id !== userId) {
    throw new ExchangeError("You are not a participant in this contract", 403);
  }

  return await prisma.workSession.findMany({
    where: { contract_id: contractId },
    orderBy: { session_number: "asc" },
  });
};

export const proposeDeadlineExtension = async (
  contractId: number,
  providerId: number,
  data: DeadlineExtensionInput,
) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: contractId },
  });

  if (!exchange) throw new ExchangeError("Contract not found", 404);
  if (exchange.provider_id !== providerId) throw new ExchangeError("Only the provider can propose an extension", 403);
  if (exchange.status !== "IN_PROGRESS" && exchange.status !== "WAITING_CONFIRMATION") {
    throw new ExchangeError("Cannot extend a contract that is not active", 400);
  }

  const result = await prisma.serviceExchange.update({
    where: { id: contractId },
    data: { proposed_end_date: data.proposedEndDate },
    select: exchangeSelect,
  });

  await createContractNotification({
    recipientId: exchange.consumer_id,
    type: "DEADLINE_PROPOSED",
    title: "تم اقتراح موعد تسليم جديد",
    body: "قام مقدم الخدمة باقتراح موعد تسليم جديد، يرجى مراجعته.",
    contractId: exchange.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const approveDeadlineExtension = async (contractId: number, consumerId: number) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: contractId },
  });

  if (!exchange) throw new ExchangeError("Contract not found", 404);
  if (exchange.consumer_id !== consumerId) throw new ExchangeError("Only the consumer can approve an extension", 403);
  if (!exchange.proposed_end_date) throw new ExchangeError("No deadline extension proposed", 400);

  const result = await prisma.serviceExchange.update({
    where: { id: contractId },
    data: {
      maximum_end_date: exchange.proposed_end_date,
      proposed_end_date: null,
    },
    select: exchangeSelect,
  });

  await createContractNotification({
    recipientId: exchange.provider_id,
    type: "DEADLINE_APPROVED",
    title: "تم الموافقة على الموعد الجديد",
    body: "تم الموافقة على موعد التسليم الجديد.",
    contractId: exchange.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const rejectDeadlineExtension = async (contractId: number, consumerId: number) => {
  const exchange = await prisma.serviceExchange.findUnique({
    where: { id: contractId },
  });

  if (!exchange) throw new ExchangeError("Contract not found", 404);
  if (exchange.consumer_id !== consumerId) throw new ExchangeError("Only the consumer can reject an extension", 403);
  if (!exchange.proposed_end_date) throw new ExchangeError("No deadline extension proposed", 400);

  const result = await prisma.serviceExchange.update({
    where: { id: contractId },
    data: { proposed_end_date: null },
    select: exchangeSelect,
  });

  await createContractNotification({
    recipientId: exchange.provider_id,
    type: "DEADLINE_REJECTED",
    title: "تم رفض الموعد المقترح",
    body: "تم رفض موعد التسليم الجديد المقترح.",
    contractId: exchange.id,
  }).catch((err) => console.error("Notification failed", err));

  return result;
};

export const resolveExpiredContracts = async () => {
  const now = new Date();

  // Find active contracts that have passed their maximum_end_date
  const expiredContracts = await prisma.serviceExchange.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "WAITING_CONFIRMATION"] },
      maximum_end_date: { lte: now },
    },
  });

  let resolvedCount = 0;

  for (const contract of expiredContracts) {
    try {
      await runSerializable(async (tx) => {
        // Re-fetch with a lock
        const currentContract = await tx.serviceExchange.findUnique({
          where: { id: contract.id },
        });

        if (
          !currentContract ||
          (currentContract.status !== "IN_PROGRESS" && currentContract.status !== "WAITING_CONFIRMATION") ||
          currentContract.maximum_end_date > now
        ) {
          return; // State changed, skip
        }

        const providerCredits = currentContract.completed_hours;
        const refundCredits = currentContract.time_credits - providerCredits;

        // Perform transfers
        if (providerCredits > 0) {
          await tx.user.update({
            where: { id: currentContract.provider_id },
            data: { available_balance: { increment: providerCredits } },
          });

          await tx.transaction.create({
            data: {
              sender_id: currentContract.consumer_id,
              receiver_id: currentContract.provider_id,
              amount: providerCredits,
              transaction_type: "TRANSFER",
            },
          });
        }

        if (refundCredits > 0) {
          await tx.user.update({
            where: { id: currentContract.consumer_id },
            data: { available_balance: { increment: refundCredits } },
          });

          await tx.transaction.create({
            data: {
              sender_id: currentContract.consumer_id,
              receiver_id: currentContract.consumer_id,
              amount: refundCredits,
              transaction_type: "REFUND",
            },
          });
        }

        // Complete the contract
        await tx.serviceExchange.update({
          where: { id: currentContract.id },
          data: {
            status: "COMPLETED",
            escrow_status: "RELEASED",
            completed_at: now,
          },
        });
      });

      await createContractNotification({
        recipientId: contract.provider_id,
        type: "CONTRACT_AUTO_RESOLVED",
        title: "تم إنهاء العقد تلقائياً",
        body: "تم إنهاء العقد تلقائياً لانتهاء المدة المتفق عليها.",
        contractId: contract.id,
      }).catch((err) => console.error("Notification failed", err));

      await createContractNotification({
        recipientId: contract.consumer_id,
        type: "CONTRACT_AUTO_RESOLVED",
        title: "تم إنهاء العقد تلقائياً",
        body: "تم إنهاء العقد تلقائياً لانتهاء المدة المتفق عليها.",
        contractId: contract.id,
      }).catch((err) => console.error("Notification failed", err));

      resolvedCount++;
    } catch (error) {
      console.error(`Failed to resolve expired contract ${contract.id}:`, error);
    }
  }

  return resolvedCount;
};
