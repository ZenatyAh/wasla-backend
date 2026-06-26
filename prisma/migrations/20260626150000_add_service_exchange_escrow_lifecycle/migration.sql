-- Safe on production DBs baselined before escrow lifecycle columns were added to the squashed schema.

DO $$
BEGIN
  CREATE TYPE "EscrowStatus" AS ENUM ('NONE', 'HELD', 'RELEASED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "escrow_status" "EscrowStatus" NOT NULL DEFAULT 'NONE';

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "maximum_end_date" TIMESTAMP(3);

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "proposed_end_date" TIMESTAMP(3);

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3);

ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMP(3);

UPDATE "service_exchanges"
SET "maximum_end_date" = COALESCE("completed_at", "created_at", NOW()) + INTERVAL '30 days'
WHERE "maximum_end_date" IS NULL;

ALTER TABLE "service_exchanges"
  ALTER COLUMN "maximum_end_date" SET NOT NULL;
