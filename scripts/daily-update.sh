#!/bin/bash
# makemerich - Daily portfolio update
# Runs Mon-Fri at 21:30 via cron

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' ~/.secrets | cut -d'=' -f2)
GITHUB_USER=$(grep '^GITHUB_USER=' ~/.secrets | cut -d'=' -f2)
TELEGRAM_USER_ID=$(grep '^TELEGRAM_USER_ID=' ~/.secrets | cut -d'=' -f2)
LOG_FILE="/tmp/makemerich-daily.log"
OPENCLAW_BIN="$HOME/.nvm/versions/node/v25.8.0/bin/openclaw"

# Load nvm / node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

notify() {
  "$OPENCLAW_BIN" agent \
    --message "$1" \
    --deliver \
    --reply-channel telegram \
    --reply-to "${TELEGRAM_USER_ID}" \
    2>/dev/null || true
}

cd "$REPO_DIR"

echo "[$(date)] Starting daily update..." | tee "$LOG_FILE"

# Always run the full close — intra-day sessions may have created the file but LEDGER update is mandatory
TODAY=$(date +%Y-%m-%d)

# Fetch prices
echo "[$(date)] Fetching prices..." | tee -a "$LOG_FILE"
if ! node scripts/fetch-prices.js >> "$LOG_FILE" 2>&1; then
  notify "⚠️ makemerich: error fetching prices — check logs."
  exit 1
fi

# Update portfolio
echo "[$(date)] Updating portfolio..." | tee -a "$LOG_FILE"
if ! node scripts/update-portfolio.js >> "$LOG_FILE" 2>&1; then
  notify "⚠️ makemerich: error updating portfolio — check logs."
  exit 1
fi

# Generate signals and validate rules (non-blocking)
echo "[$(date)] Generating signals..." | tee -a "$LOG_FILE"
node scripts/generate-signals.js >> "$LOG_FILE" 2>&1 || true

echo "[$(date)] Validating rules..." | tee -a "$LOG_FILE"
node scripts/validate-rules.js >> "$LOG_FILE" 2>&1 || true

# Regenerate dashboard
echo "[$(date)] Generating dashboard..." | tee -a "$LOG_FILE"
node scripts/generate-dashboard.js >> "$LOG_FILE" 2>&1 || true

# Get balance for commit message and notification
BALANCE=$(node scripts/calculate-balance.js 2>/dev/null | grep "Balance:" | awk '{print $2, $3}')
DAY=$(node -e "const d=require('./data/$TODAY.json'); console.log(d.day)" 2>/dev/null || echo "?")

# Commit and push
git add -A
git commit -m "Daily update: $TODAY - $BALANCE"
git remote set-url origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/makemerich.git"
git push
git remote set-url origin "https://github.com/${GITHUB_USER}/makemerich.git"

echo "[$(date)] Done: $BALANCE" | tee -a "$LOG_FILE"

# Notify Jose
notify "📊 makemerich Day $DAY ($TODAY)
Balance: $BALANCE
Commit pushed to GitHub ✅"
