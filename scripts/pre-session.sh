#!/bin/bash
# MakeMeRich - Pre-session data prep
#
# Runs all data scripts so Hustle starts with fresh, pre-computed data.
# Use as Claude Code hook or run manually before each session.
#
# Usage:
#   bash scripts/pre-session.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

echo "=== MakeMeRich Pre-Session ==="
echo "$(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# 1. Fetch latest prices
echo "[1/5] Fetching prices..."
node scripts/fetch-prices.js
echo ""

# 2. Update portfolio valuations
echo "[2/5] Updating portfolio..."
node scripts/update-portfolio.js
echo ""

# 3. Check alerts (don't exit on code 1 — alerts are expected)
echo "[3/5] Checking alerts..."
node scripts/check-alerts.js || true
echo ""

# 4. Generate signals
echo "[4/5] Generating signals..."
node scripts/generate-signals.js
echo ""

# 5. Validate rules
echo "[5/5] Validating rules..."
node scripts/validate-rules.js || true
echo ""

echo "=== Pre-session complete. Ready for Hustle. ==="
