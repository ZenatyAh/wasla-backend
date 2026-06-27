export type WorkSessionStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "REJECTED";

export type ResolutionFault = "NONE" | "SEEKER" | "PROVIDER";

export type ResolutionPlan = {
  status: "COMPLETED" | "DISPUTED";
  escrowStatus: "RELEASED" | "REFUNDED";
  providerCredits: number;
  refundCredits: number;
  fault: ResolutionFault;
  notificationType: "CONTRACT_AUTO_COMPLETED" | "CONTRACT_AUTO_DISPUTED";
};

export function buildDeadlineResolutionPlan(input: {
  timeCredits: number;
  completedHours: number;
  lastSession: { status: WorkSessionStatus } | null;
}): ResolutionPlan {
  const { timeCredits, completedHours, lastSession } = input;

  if (completedHours === timeCredits) {
    return {
      status: "COMPLETED",
      escrowStatus: "RELEASED",
      providerCredits: timeCredits,
      refundCredits: 0,
      fault: "NONE",
      notificationType: "CONTRACT_AUTO_COMPLETED",
    };
  }

  if (
    lastSession?.status === "PENDING_CONFIRMATION"
  ) {
    return {
      status: "DISPUTED",
      escrowStatus: "RELEASED",
      providerCredits: completedHours,
      refundCredits: timeCredits - completedHours,
      fault: "SEEKER",
      notificationType: "CONTRACT_AUTO_DISPUTED",
    };
  }

  return {
    status: "DISPUTED",
    escrowStatus: "REFUNDED",
    providerCredits: 0,
    refundCredits: timeCredits,
    fault: "PROVIDER",
    notificationType: "CONTRACT_AUTO_DISPUTED",
  };
}

export const deadlineResolutionNotificationCopy = (plan: ResolutionPlan) => {
  if (plan.notificationType === "CONTRACT_AUTO_COMPLETED") {
    return {
      title: "تم إكمال العقد بنجاح",
      body: "تم إكمال العقد تلقائياً بعد انتهاء المدة المتفق عليها.",
    };
  }

  if (plan.fault === "SEEKER") {
    return {
      title: "تم إنهاء العقد مع نزاع",
      body: "انتهت مدة العقد ولم يتم تأكيد آخر جلسة عمل. تم تحويل الساعات المؤكدة لمقدم الخدمة وإرجاع المتبقي.",
    };
  }

  return {
    title: "تم إنهاء العقد مع نزاع",
    body: "انتهت مدة العقد دون إكمال الساعات المتفق عليها. تم إرجاع جميع الساعات المحجوزة لطالب الخدمة.",
  };
};
