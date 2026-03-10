#!/bin/bash
# makemerich - Daily portfolio update
# Runs Mon-Fri at 21:30 via cron

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' ~/.secrets | cut -d'=' -f2)
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
    --reply-to "159054208" \
    2>/dev/null || true
}

cd "$REPO_DIR"

echo "[$(date)] Iniciando update diario..." | tee "$LOG_FILE"

# Check if market was open today (skip if already have today's data)
TODAY=$(date +%Y-%m-%d)
if [ -f "data/$TODAY.json" ]; then
  echo "[$(date)] Ya existe data/$TODAY.json — nada que hacer." | tee -a "$LOG_FILE"
  exit 0
fi

# Fetch prices
echo "[$(date)] Fetching prices..." | tee -a "$LOG_FILE"
if ! node scripts/fetch-prices.js >> "$LOG_FILE" 2>&1; then
  notify "⚠️ makemerich: error al obtener precios — revisa los logs."
  exit 1
fi

# Update portfolio
echo "[$(date)] Updating portfolio..." | tee -a "$LOG_FILE"
if ! node scripts/update-portfolio.js >> "$LOG_FILE" 2>&1; then
  notify "⚠️ makemerich: error al actualizar portfolio — revisa los logs."
  exit 1
fi

# Get balance for commit message and notification
BALANCE=$(node scripts/calculate-balance.js 2>/dev/null | grep "Balance:" | awk '{print $2, $3}')
DAY=$(node -e "const d=require('./data/$TODAY.json'); console.log(d.day)" 2>/dev/null || echo "?")

# Commit and push
git add -A
git commit -m "Daily update: $TODAY - $BALANCE"
git remote set-url origin "https://jmlweb:${GITHUB_TOKEN}@github.com/jmlweb/makemerich.git"
git push
git remote set-url origin "https://github.com/jmlweb/makemerich.git"

echo "[$(date)] Done: $BALANCE" | tee -a "$LOG_FILE"

# Notify Jose
notify "📊 makemerich Day $DAY ($TODAY)
Balance: $BALANCE
Commit pusheado a GitHub ✅"
