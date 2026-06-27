-- UC-TX-07: contract resolution audit + notification types

DO $$ BEGIN
  CREATE TYPE "ResolutionFaultParty" AS ENUM ('NONE', 'SEEKER', 'PROVIDER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "service_exchanges"
ADD COLUMN IF NOT EXISTS "resolution_fault_party" "ResolutionFaultParty";

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_AUTO_COMPLETED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_AUTO_DISPUTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_RESOLUTION_FAILED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
