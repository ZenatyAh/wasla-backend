-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'DEADLINE_APPROACHING';

-- AlterTable
ALTER TABLE "service_exchanges" ADD COLUMN "deadline_reminder_sent_at" TIMESTAMP(3);
