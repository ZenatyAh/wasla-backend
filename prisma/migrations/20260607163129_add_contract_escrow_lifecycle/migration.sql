-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('NONE', 'HELD', 'RELEASED', 'REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceExchangeStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_CONFIRMATION', 'COMPLETED', 'CANCELED', 'REJECTED', 'DISPUTED');
ALTER TABLE "public"."service_exchanges" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "service_exchanges" ALTER COLUMN "status" TYPE "ServiceExchangeStatus_new" USING ("status"::text::"ServiceExchangeStatus_new");
ALTER TYPE "ServiceExchangeStatus" RENAME TO "ServiceExchangeStatus_old";
ALTER TYPE "ServiceExchangeStatus_new" RENAME TO "ServiceExchangeStatus";
DROP TYPE "public"."ServiceExchangeStatus_old";
ALTER TABLE "service_exchanges" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "service_exchanges" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "escrow_status" "EscrowStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "services_provided" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "services_received" INTEGER NOT NULL DEFAULT 0;

-- Enforce non-negative time-credit balances at the database level (escrow safety net).
ALTER TABLE "users" ADD CONSTRAINT "users_available_balance_nonneg" CHECK ("available_balance" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_escrow_balance_nonneg" CHECK ("escrow_balance" >= 0);
