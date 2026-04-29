#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Living Nexus — Nightly Sovereign Stamp Cron Job
# scripts/cron-nightly-stamp.sh
#
# Runs the batch-stamp-registry.mjs script nightly to automatically stamp
# any newly registered works that have a WID and audio file but no stamp.
#
# Setup (run once on the deployment server):
#   chmod +x scripts/cron-nightly-stamp.sh
#   crontab -e
#   Add: 0 3 * * * /path/to/project/scripts/cron-nightly-stamp.sh >> /var/log/living-nexus-stamp.log 2>&1
#
# The cron runs at 3:00 AM daily (low-traffic window).
# Logs are appended to /var/log/living-nexus-stamp.log.
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Resolve project root (directory of this script) ─────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Living Nexus — Nightly Stamp Cron"
echo "  Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "  Project: $PROJECT_ROOT"
echo "═══════════════════════════════════════════════════════════════"

# ── Load .env if present (for local/staging environments) ───────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "  Loading .env from project root"
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

# ── Verify required env vars ─────────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "  ERROR: DATABASE_URL is not set. Aborting."
  exit 1
fi

if [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  echo "  ERROR: AWS credentials are not set. Aborting."
  exit 1
fi

# ── Run the batch stamp script ───────────────────────────────────────────────
cd "$PROJECT_ROOT"

echo "  Running batch-stamp-registry.mjs..."
node --import tsx/esm scripts/batch-stamp-registry.mjs

EXIT_CODE=$?

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Completed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "  Exit code: $EXIT_CODE"
echo "═══════════════════════════════════════════════════════════════"
echo ""

exit $EXIT_CODE
