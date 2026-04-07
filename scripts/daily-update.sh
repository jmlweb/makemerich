#!/bin/bash
# makemerich - Daily close session (21:30 L-V)
# Flow: fetch → update → validate → signals → decide → act → LEDGER → commit → report
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VENV_PYTHON="/home/hustle/.config/hustle/venv/bin/python3"
SEND_ALERT="/home/hustle/projects/hustle/core/lib/send_alert.py"
LOG_FILE="/tmp/makemerich-daily.log"
CLAUDE_BIN="/home/hustle/.local/bin/claude"

# Load nvm / node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

cd "$REPO_DIR"
echo "[$(date)] Starting daily close..." | tee "$LOG_FILE"

# 1. Fetch prices
echo "[1/7] Fetching prices..." | tee -a "$LOG_FILE"
node scripts/fetch-prices.js >> "$LOG_FILE" 2>&1 || { "$VENV_PYTHON" "$SEND_ALERT" "⚠️ makemerich: error fetching prices"; exit 1; }

# 2. Fetch historical OHLCV data
echo "[2/7] Updating historical data..." | tee -a "$LOG_FILE"
node scripts/fetch-history.js >> "$LOG_FILE" 2>&1 || echo "Warning: history fetch failed" >> "$LOG_FILE"

# 3. Update portfolio
echo "[3/7] Updating portfolio..." | tee -a "$LOG_FILE"
node scripts/update-portfolio.js >> "$LOG_FILE" 2>&1 || { "$VENV_PYTHON" "$SEND_ALERT" "⚠️ makemerich: error updating portfolio"; exit 1; }

# 4. Validate rules
echo "[4/7] Validating rules..." | tee -a "$LOG_FILE"
VIOLATION_COUNT=$(node scripts/validate-rules.js 2>/dev/null | grep "VIOLATIONS (" | grep -oP '\d+' | head -1 || echo "0")

# 5. Generate threshold signals
echo "[5/7] Generating signals..." | tee -a "$LOG_FILE"
SIGNALS_OUTPUT=$(node scripts/generate-signals.js 2>/dev/null)

# 6. Generate quantitative signals
echo "[6/7] Generating quant signals..." | tee -a "$LOG_FILE"
QUANT_OUTPUT=$(node scripts/generate-quant-signals.js 2>/dev/null || echo "Quant signals unavailable")
NEAR_TRIGGERS=$(echo "$SIGNALS_OUTPUT" | grep -A20 "NEAR TRIGGER:" | grep -v "NEAR TRIGGER:" | grep -v "ACTIVE MONITORS:" | grep "\S" | head -5 | tr '\n' ' ' | tr "'" ' ' || true)

# 7. Execute signals — generate binding trade orders
echo "[7/8] Computing trade orders..." | tee -a "$LOG_FILE"
TRADE_ORDERS=$(node scripts/execute-signals.js 2>/dev/null || echo "No trade orders")

# 8. Delegate to agent: execute orders, update LEDGER, commit, report
echo "[8/8] Delegating to agent..." | tee -a "$LOG_FILE"

BALANCE=$("$VENV_PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"balance_eur\"]:.2f}')" 2>/dev/null || echo "?")
PNL=$("$VENV_PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"pnl_pct\"]:.1f}')" 2>/dev/null || echo "?")
TODAY=$(date +%Y-%m-%d)

PRICES_SUMMARY=$("$VENV_PYTHON" -c "
import json
p = json.load(open('data/.prices-latest.json'))
lines = [f'{k.upper()}: {v}' for k, v in p.items() if k in ('sp500','nasdaq','gold','eth','btc','eurusd')]
print(', '.join(lines))
" 2>/dev/null || echo "")

HOLDINGS=$("$VENV_PYTHON" -c "
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

HOLDINGS_COMPACT=$("$VENV_PYTHON" -c "
import json
p = json.load(open('data/portfolio.json'))
lines = []
for k, v in sorted(p['holdings'].items(), key=lambda x: -x[1].get('amount_eur', 0)):
    if k == 'CASH':
        lines.append(f'CASH  EUR {v[\"amount_eur\"]:.0f}')
    else:
        amt = v.get('amount_eur', 0)
        pnl = v.get('pnl_pct', 0)
        sign = '+' if pnl > 0 else ''
        lines.append(f'{k:<5} EUR {amt:>5.0f}  {sign}{pnl:.1f}%')
print(chr(10).join(lines))
" 2>/dev/null || echo "ver portfolio.json")

DAY_NUMBER=$(( $(ls data/2026-*.json 2>/dev/null | wc -l) - 1 ))

TELEGRAM_FORMAT="Use EXACTLY this Telegram format (no markdown, no extra lines):
Line 1: 📊 Day $DAY_NUMBER | EUR X.XXX (PNL%)
Line 2: 📈 or 📉 +/-EUR XX hoy (+/-X,X%)
Line 3: (blank)
Line 4: ✅ DECISION — reason in one sentence
Line 5+: (only if alerts) ⚠️ alert lines
Line 6: (blank)
Line 7+: positions table, one per line: TICKER  EUR X.XXX  +/-X,X%
Last line: CASH  EUR XXX"

PROMPT="makemerich DAILY CLOSE $TODAY. Balance: EUR $BALANCE ($PNL%). Holdings: $HOLDINGS. Prices: $PRICES_SUMMARY. Violations: $VIOLATION_COUNT. Near triggers: $NEAR_TRIGGERS. Quant signals: $QUANT_OUTPUT. TRADE ORDERS (BINDING): $TRADE_ORDERS. MANDATORY FLOW: 1) Execute ALL trade orders from execute-signals.js — these are BINDING, not suggestions. Do NOT override them with your own analysis. If no orders, action is HOLD. 2) Update portfolio.json with any executed trades. 3) Append the day entry to LEDGER.md in English following the existing format (Day N, date, balance, prices, performance table, trades, analysis). 4) git add -A && git commit with message \"log: Day $DAY_NUMBER — ACTION, portfolio summary ($TODAY)\" and git push (use GITHUB_TOKEN from ~/.secrets). 5) Output ONLY the Telegram message in Spanish as facts: decisions taken, trades executed (or HOLD + why), balance. Never suggest — past-tense facts only. DO NOT call send_alert.py — just print the message to stdout. $TELEGRAM_FORMAT"

build_fallback_msg() {
  local decision_emoji="📈"
  if echo "$PNL" | grep -q "^-"; then decision_emoji="📉"; fi
  cat <<EOFMSG
📊 Day $DAY_NUMBER | EUR $BALANCE ($PNL%)
$decision_emoji Cierre $TODAY

✅ HOLD — Cierre automatico (sin agente)

$HOLDINGS_COMPACT
EOFMSG
}

if [ -x "$CLAUDE_BIN" ]; then
  echo "Delegating to Claude Code CLI..." | tee -a "$LOG_FILE"
  export PATH="/home/hustle/.local/bin:/home/hustle/.nvm/versions/node/v25.8.0/bin:$PATH"
  set +e
  CLAUDE_MSG=$(timeout 180 "$CLAUDE_BIN" --model sonnet -p "$PROMPT" --output-format text --max-turns 15 --allowedTools Bash Read Write Edit 2>>"$LOG_FILE")
  CLAUDE_EXIT=$?
  set -e
  echo "$CLAUDE_MSG" >> "$LOG_FILE"
  if [ $CLAUDE_EXIT -eq 0 ] && [ -n "$CLAUDE_MSG" ]; then
    "$VENV_PYTHON" "$SEND_ALERT" "$CLAUDE_MSG"
  else
    echo "Claude CLI failed or timed out — sending static report" | tee -a "$LOG_FILE"
    "$VENV_PYTHON" "$SEND_ALERT" "$(build_fallback_msg)"
  fi
else
  echo "Claude CLI not found — sending static report" | tee -a "$LOG_FILE"
  "$VENV_PYTHON" "$SEND_ALERT" "$(build_fallback_msg)"
fi

echo "[$(date)] Daily close complete." | tee -a "$LOG_FILE"
