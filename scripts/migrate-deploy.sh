#!/usr/bin/env sh
set -e

# Clear failed marker for escrow migration (bad ordering vs service_exchanges creation).
# Safe no-op when the migration is not in a failed state.
prisma migrate resolve --rolled-back 20260607163129_add_contract_escrow_lifecycle 2>/dev/null || true

prisma migrate deploy
