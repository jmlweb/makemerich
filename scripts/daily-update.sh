#!/bin/bash
# makemerich - Daily close session (21:30 L-V)
# Flujo: fetch → update → validate → signals → decide → act → LEDGER → commit → report
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' ~/.secrets | cut -d'=' -f2)
GITHUB_USER=$(grep '^GITHUB_USER=' ~/.secrets | cut -d'=' -f2)
LOG_FILE="/tmp/makemerich-daily.log"
OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"

# Load nvm / node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

HOOK_TOKEN=$(python3 -c "import json; print(json.load(open('$OPENCLAW_CONFIG')).get('hooks',{}).get('token',''))" 2>/dev/null || echo "")
BOT_TOKEN=$(python3 -c "import json; print(json.load(open('$OPENCLAW_CONFIG'))['channels']['telegram']['botToken'])" 2>/dev/null || echo "")
CHAT_ID="159054208"

send_telegram() {
  python3 -c "
import urllib.parse, urllib.request
data = urllib.parse.urlencode({'chat_id': '$CHAT_ID', 'text': '''$1''', 'parse_mode': 'Markdown'}).encode()
urllib.request.urlopen(urllib.request.Request('https://api.telegram.org/bot${BOT_TOKEN}/sendMessage', data=data), timeout=10)
" 2>/dev/null || true
}

cd "$REPO_DIR"
echo "[$(date)] Starting daily close..." | tee "$LOG_FILE"

# 1. Fetch prices
echo "[1/5] Fetching prices..." | tee -a "$LOG_FILE"
node scripts/fetch-prices.js >> "$LOG_FILE" 2>&1 || { send_telegram "⚠️ makemerich: error fetching prices"; exit 1; }

# 2. Update portfolio
echo "[2/5] Updating portfolio..." | tee -a "$LOG_FILE"
node scripts/update-portfolio.js >> "$LOG_FILE" 2>&1 || { send_telegram "⚠️ makemerich: error updating portfolio"; exit 1; }

# 3. Validate rules
echo "[3/5] Validating rules..." | tee -a "$LOG_FILE"
VIOLATION_COUNT=$(node scripts/validate-rules.js 2>/dev/null | grep "VIOLATIONS (" | grep -oP '\d+' | head -1 || echo "0")

# 4. Generate signals
echo "[4/5] Generating signals..." | tee -a "$LOG_FILE"
SIGNALS_OUTPUT=$(node scripts/generate-signals.js 2>/dev/null)
NEAR_TRIGGERS=$(echo "$SIGNALS_OUTPUT" | grep -A20 "NEAR TRIGGER:" | grep -v "NEAR TRIGGER:" | grep -v "ACTIVE MONITORS:" | head -5 | tr '\n' ' ' | sed "s/'//g" || true)

# 5. Delegate to agent: decide, execute, update LEDGER, commit, report
echo "[5/5] Delegating to agent..." | tee -a "$LOG_FILE"

BALANCE=$(python3 -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"balance_eur\"]:.2f}')" 2>/dev/null || echo "?")
PNL=$(python3 -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"pnl_pct\"]:.1f}')" 2>/dev/null || echo "?")
TODAY=$(date +%Y-%m-%d)

PRICES_SUMMARY=$(python3 -c "
import json
p = json.load(open('data/.prices-latest.json'))
lines = [f'{k.upper()}: {v}' for k, v in p.items() if k in ('sp500','nasdaq','gold','eth','btc','eurusd')]
print(', '.join(lines))
" 2>/dev/null || echo "")

HOLDINGS=$(python3 -c "
import json
p = json.load(open('data/portfolio.json'))
lines = []
for k, v in p['holdings'].items():
    if k == 'CASH':
        lines.append(f'CASH: {v[\"amount_eur\"]:.0f}EUR')
    else:
        amt = v.get('amount_eur', 0)
        pnl = v.get('pnl_pct', 0)
        stop = v.get('stop_loss_eur') or v.get('stop_loss_usd')
        lines.append(f'{k}: {amt:.0f}EUR (pnl={pnl}%, stop={stop})')
print(' | '.join(lines))
" 2>/dev/null || echo "")

if [ -n "$HOOK_TOKEN" ]; then
  HOOK_MSG=$(TODAY="$TODAY" BALANCE="$BALANCE" PNL="$PNL" HOLDINGS="$HOLDINGS" \
    PRICES_SUMMARY="$PRICES_SUMMARY" VIOLATION_COUNT="$VIOLATION_COUNT" NEAR_TRIGGERS="$NEAR_TRIGGERS" \
    python3 -c "
import json, os
today = os.environ.get('TODAY','?')
balance = os.environ.get('BALANCE','?')
pnl = os.environ.get('PNL','?')
holdings = os.environ.get('HOLDINGS','')
prices = os.environ.get('PRICES_SUMMARY','')
violations = os.environ.get('VIOLATION_COUNT','0')
near = os.environ.get('NEAR_TRIGGERS','')
msg = (
    f'makemerich DAILY CLOSE {today}. Balance: EUR {balance} ({pnl}%). '
    f'Holdings: {holdings}. Prices: {prices}. Violations: {violations}. Near triggers: {near}. '
    f'MANDATORY FLOW (HUSTLE.md): '
    f'1) Analyze all positions and signals. '
    f'2) Make decisions and EXECUTE any trade NOW if warranted — do not suggest, act. '
    f'3) Append the day entry to LEDGER.md in English following the existing format (Day N, date, balance, prices, performance table, trades, analysis). '
    f'4) git add -A && git commit with message \"Day N: CLOSE EUR BALANCE (PNL%)\" and git push (use GITHUB_TOKEN from ~/.secrets). '
    f'5) Report to Jose in Spanish only facts: decisions taken, trades executed (or HOLD + why), balance. Never suggest — past-tense facts only.'
)
print(json.dumps({'message': msg, 'name': 'makemerich-close', 'channel': 'telegram', 'deliver': True}))
")
  HOOK_RESULT=$(curl -s -o /tmp/makemerich-hook-result.txt -w "%{http_code}" \
    -X POST http://127.0.0.1:18789/hooks/agent \
    -H "Authorization: Bearer $HOOK_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$HOOK_MSG" 2>&1)
  echo "[$(date)] Agent hook result: $HOOK_RESULT" | tee -a "$LOG_FILE"

  # Fallback: always send a direct Telegram summary regardless of hook result
  # This ensures Jose always gets a close notification
  DAY_NUM=$(node -e "try{const d=require('./data/$TODAY.json');console.log(d.day||'?')}catch(e){console.log('?')}" 2>/dev/null || echo "?")
  NEAR=$(node scripts/generate-signals.js 2>/dev/null | grep "NEAR TRIGGER" -A5 | grep "STOP_LOSS\|DRAWDOWN" | head -2 | sed 's/^  //' | tr '\n' ' ' || echo "")

  send_telegram "📊 *makemerich Día $DAY_NUM — Cierre $TODAY*

💰 Balance: €$BALANCE ($PNL%)
$HOLDINGS

$NEAR"
else
  echo "WARNING: No hook token" | tee -a "$LOG_FILE"
  # Send direct summary
  send_telegram "📊 *makemerich — Cierre $TODAY*
💰 Balance: €$BALANCE ($PNL%)"
fi
