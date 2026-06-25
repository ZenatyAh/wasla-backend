#!/usr/bin/env sh
set -e

# Legacy failed escrow migration (removed from history after squash).
prisma migrate resolve --rolled-back 20260607163129_add_contract_escrow_lifecycle 2>/dev/null || true

# Clear P3009 failed marker for squashed init migration on existing production DBs.
prisma migrate resolve --rolled-back 20260625170852_init_schema 2>/dev/null || true

# When core tables already exist (incremental migrations applied before squash),
# baseline the squashed migration instead of re-running CREATE TABLE statements.
if prisma db execute --stdin <<'SQL' >/dev/null 2>&1
SELECT 1 FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'users'
LIMIT 1;
SQL
then
  prisma migrate resolve --applied 20260625170852_init_schema 2>/dev/null || true
fi

prisma migrate deploy
