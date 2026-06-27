import cron from "node-cron";
import {
  notifyApproachingDeadlines,
  resolveExpiredContracts,
} from "../../modules/exchanges/exchanges.service.js";

export const startCronJobs = () => {
  // Resolve expired contracts every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Running expired contracts resolution...");
    try {
      const resolvedCount = await resolveExpiredContracts();
      console.log(
        `[Cron] Successfully resolved ${resolvedCount} expired contracts.`,
      );
    } catch (error) {
      console.error("[Cron] Failed to resolve expired contracts:", error);
    }
  });

  // Remind both parties when a contract deadline is within 24 hours
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Running approaching deadline reminders...");
    try {
      const notifiedCount = await notifyApproachingDeadlines();
      console.log(
        `[Cron] Sent approaching-deadline reminders for ${notifiedCount} contracts.`,
      );
    } catch (error) {
      console.error("[Cron] Failed to send deadline reminders:", error);
    }
  });

  console.log("[Cron] Scheduled jobs initialized.");
};
