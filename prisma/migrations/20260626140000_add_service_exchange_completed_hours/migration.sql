-- Safe on production DBs baselined before completed_hours was added to the squashed schema.
ALTER TABLE "service_exchanges"
  ADD COLUMN IF NOT EXISTS "completed_hours" INTEGER NOT NULL DEFAULT 0;

-- Backfill from confirmed work sessions so existing contracts stay accurate.
UPDATE "service_exchanges" se
SET "completed_hours" = COALESCE(
  (
    SELECT SUM(ws.hours)
    FROM "work_sessions" ws
    WHERE ws.contract_id = se.id
      AND ws.status = 'CONFIRMED'
  ),
  0
);
