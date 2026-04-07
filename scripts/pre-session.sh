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
echo "[1/7] Fetching prices..."
node scripts/fetch-prices.js
echo ""

# 2. Fetch historical OHLCV data
echo "[2/7] Updating historical data..."
node scripts/fetch-history.js
echo ""

# 3. Update portfolio valuations
echo "[3/7] Updating portfolio..."
node scripts/update-portfolio.js
echo ""

# 4. Check alerts (don't exit on code 1 — alerts are expected)
echo "[4/7] Checking alerts..."
node scripts/check-alerts.js || true
echo ""

# 5. Generate threshold signals
echo "[5/7] Generating signals..."
node scripts/generate-signals.js
echo ""

# 6. Generate quantitative signals
echo "[6/7] Generating quant signals..."
node scripts/generate-quant-signals.js
echo ""

# 7. Validate rules
echo "[7/8] Validating rules..."
node scripts/validate-rules.js || true
echo ""

# 8. Generate trade orders from quant signals
echo "[8/8] Computing trade orders..."
node scripts/execute-signals.js
echo ""

echo "=== Pre-session complete. Ready for Hustle. ==="
