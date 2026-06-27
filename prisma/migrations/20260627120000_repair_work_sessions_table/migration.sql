-- Repair baselined production DBs where init_schema was marked applied without creating work_sessions.

DO $$
BEGIN
  CREATE TYPE "WorkSessionStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "work_sessions" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "session_number" INTEGER NOT NULL,
    "hours" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_sessions_contract_id_status_idx"
  ON "work_sessions"("contract_id", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "work_sessions_contract_id_session_number_key"
  ON "work_sessions"("contract_id", "session_number");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_sessions_contract_id_fkey'
  ) THEN
    ALTER TABLE "work_sessions"
      ADD CONSTRAINT "work_sessions_contract_id_fkey"
      FOREIGN KEY ("contract_id") REFERENCES "service_exchanges"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
