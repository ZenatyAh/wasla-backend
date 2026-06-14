-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "is_online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "last_seen" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "clientMessageId" TEXT;
ALTER TABLE "messages" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'SENT';
ALTER TABLE "messages" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN "readAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "messages_clientMessageId_key" ON "messages"("clientMessageId");
