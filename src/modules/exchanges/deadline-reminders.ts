export type DeadlineReminderRole = "provider" | "consumer";

export const approachingDeadlineNotificationCopy = (
  role: DeadlineReminderRole,
  endDateLabel: string,
) => {
  if (role === "provider") {
    return {
      title: "اقترب موعد انتهاء العقد",
      body: `يتبقى أقل من 24 ساعة على موعد انتهاء العقد (${endDateLabel}). يمكنك اقتراح تمديد الموعد من صفحة العقد قبل انتهاء المدة.`,
    };
  }

  return {
    title: "اقترب موعد انتهاء العقد",
    body: `يتبقى أقل من 24 ساعة على موعد انتهاء العقد (${endDateLabel}). إذا اقترح مقدم الخدمة تمديداً، يمكنك الموافقة أو الرفض من صفحة العقد.`,
  };
};
