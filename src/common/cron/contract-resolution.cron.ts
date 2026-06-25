import cron from "node-cron";
import { resolveExpiredContracts } from "../../modules/exchanges/exchanges.service.js";

export const startCronJobs = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Running expired contracts resolution...");
    try {
      const resolvedCount = await resolveExpiredContracts();
      console.log(`[Cron] Successfully resolved ${resolvedCount} expired contracts.`);
    } catch (error) {
      console.error("[Cron] Failed to resolve expired contracts:", error);
    }
  });

  console.log("[Cron] Scheduled jobs initialized.");
};
