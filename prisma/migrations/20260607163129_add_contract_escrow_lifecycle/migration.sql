-- Escrow enum + user stats/constraints only.
-- service_exchanges is created in the later 20260607200000 migration with the final schema.

DO $$ BEGIN
    CREATE TYPE "EscrowStatus" AS ENUM ('NONE', 'HELD', 'RELEASED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "services_provided" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "services_received" INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_available_balance_nonneg" CHECK ("available_balance" >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_escrow_balance_nonneg" CHECK ("escrow_balance" >= 0);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
