#!/bin/bash
# makemerich - Autonomous quantitative trading session
# Runs at: 09:00, 12:00, 15:30, 18:00 Mon-Fri + weekends (crypto only).
# Triggered by hustle BullMQ workers (apps/core/src/workers/create-workers.ts).
#
# Flow: fetch -> history -> update -> validate -> signals -> quant -> orders ->
#       apply -> [agent if needed] -> commit -> Telegram report.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$REPO_DIR/scripts"
PYTHON="${PYTHON:-/usr/bin/python3}"
SEND_TG="$SCRIPT_DIR/_send-telegram.js"
LOG_FILE="/tmp/makemerich-session.log"
CLAUDE_BIN="${CLAUDE_BIN:-/home/hustle/.local/bin/claude}"

FORCE_AGENT=0
SESSION_LABEL="check"
for arg in "$@"; do
  case "$arg" in
    --force-agent) FORCE_AGENT=1 ;;
    *) SESSION_LABEL="$arg" ;;
  esac
done

# Load nvm / node
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

exec >> "$LOG_FILE" 2>&1
echo ""
echo "=== $(date '+%Y-%m-%d %H:%M:%S') [$SESSION_LABEL] ==="

cd "$REPO_DIR"
TODAY=$(date +%Y-%m-%d)

send_tg() {
  node "$SEND_TG" "$1" || echo "Warning: telegram send failed"
}

read_portfolio_state() {
  BALANCE=$("$PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"balance_eur\"]:.2f}')" 2>/dev/null || echo "?")
  PNL=$("$PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"pnl_pct\"]:.1f}')" 2>/dev/null || echo "?")
  HOLDINGS_COMPACT=$("$PYTHON" -c "
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
  DAY_NUMBER=$("$PYTHON" -c "import json; d=json.load(open('data/$TODAY.json')); print(d['day'])" 2>/dev/null \
    || echo "$(( $(ls data/2026-*.json 2>/dev/null | wc -l) ))")
}

build_telegram_msg() {
  local decision="$1"
  local reason="$2"
  local alerts="$3"
  local decision_emoji="📈"
  if echo "$PNL" | grep -q "^-"; then decision_emoji="📉"; fi

  local prev_balance
  prev_balance=$("$PYTHON" -c "
import json, glob
files = sorted(glob.glob('data/2026-*.json'))
today_f = 'data/$TODAY.json'
prev = [f for f in files if f < today_f]
if prev: print(json.load(open(prev[-1]))['balance']['total'])
else: print('$BALANCE')
" 2>/dev/null || echo "$BALANCE")
  local day_change
  day_change=$("$PYTHON" -c "print(f'{$BALANCE - $prev_balance:.0f}')" 2>/dev/null || echo "0")
  local day_change_pct
  day_change_pct=$("$PYTHON" -c "print(f'{($BALANCE - $prev_balance) / $prev_balance * 100:.1f}')" 2>/dev/null || echo "0")

  local sign=""
  if [ "$(echo "$day_change" | grep -c "^-")" -eq 0 ]; then sign="+"; fi

  local msg
  msg="📊 Day $DAY_NUMBER | EUR ${BALANCE} (${PNL}%)
${decision_emoji} ${sign}EUR ${day_change} hoy (${sign}${day_change_pct}%)

✅ ${decision} — ${reason}"

  if [ -n "$alerts" ]; then
    msg="$msg
$alerts"
  fi

  msg="$msg

$HOLDINGS_COMPACT"

  echo "$msg"
}

# 1. Fetch latest prices
echo "[1/9] Fetching prices..."
node scripts/fetch-prices.js 2>&1 || { echo "ERROR: fetch-prices failed"; exit 1; }

# 2. Fetch historical OHLCV data
echo "[2/9] Updating historical data..."
node scripts/fetch-history.js 2>&1 || echo "Warning: history fetch failed"

# 3. Update portfolio values
echo "[3/9] Updating portfolio..."
node scripts/update-portfolio.js 2>&1 || { echo "ERROR: update-portfolio failed"; exit 1; }

# 4. Validate investment rules
echo "[4/9] Validating rules..."
VIOLATIONS=$(node scripts/validate-rules.js 2>/dev/null || true)
VIOLATION_COUNT=$(echo "$VIOLATIONS" | grep "VIOLATIONS (" | grep -oP '\d+' | head -1 || echo "0")

# 5. Generate threshold signals
echo "[5/9] Generating signals..."
SIGNALS_OUTPUT=$(node scripts/generate-signals.js 2>/dev/null)
NEAR_TRIGGERS=$(echo "$SIGNALS_OUTPUT" | grep -A20 "NEAR TRIGGER:" | grep -v "NEAR TRIGGER:" | grep -v "ACTIVE MONITORS:" | grep "\S" | head -5 | tr '\n' ' ' | tr "'" ' ' || true)

# 6. Generate quantitative signals
echo "[6/9] Generating quant signals..."
QUANT_OUTPUT=$(node scripts/generate-quant-signals.js 2>/dev/null || echo "Quant signals unavailable")

# 7. Compute binding trade orders
echo "[7/9] Computing trade orders..."
TRADE_ORDERS=$(node scripts/execute-signals.js 2>/dev/null || echo "No trade orders")

# Pre-check: skip agent when nothing actionable
TRIMMED_TRIGGERS=$(echo "$NEAR_TRIGGERS" | tr -d '[:space:]')
ACTUAL_ORDERS=$(echo "$TRADE_ORDERS" | grep "ORDERS (0)" > /dev/null 2>&1 && echo "0" || echo "1")

if [ "$FORCE_AGENT" -eq 0 ] && [ "${VIOLATION_COUNT:-0}" = "0" ] && [ -z "$TRIMMED_TRIGGERS" ] && [ "$ACTUAL_ORDERS" = "0" ]; then
  echo "pre-check: skip (no violations, no triggers, no trade orders)"
  read_portfolio_state
  send_tg "$(build_telegram_msg "HOLD" "sesion automatica, sin novedades" "")"
  echo "=== Session $SESSION_LABEL complete (pre-check skip) ==="
  exit 0
fi

# --- Something actionable: apply trades + get analysis ---

# 8. Apply trades mechanically
echo "[8/9] Applying trades..."
APPLY_OUTPUT=$(node scripts/apply-trades.js 2>&1 || echo "Warning: apply-trades failed")
echo "$APPLY_OUTPUT"
TRADES_EXECUTED=$(echo "$APPLY_OUTPUT" | grep -oP '"tradesExecuted":\s*\K\d+' || echo "0")

# 9. Generate LEDGER draft + get agent analysis
echo "[9/9] Generating LEDGER draft..."
node scripts/generate-ledger-entry.js --date "$TODAY" 2>&1 || echo "Warning: ledger draft failed"

read_portfolio_state

# Build alerts string
ALERTS=""
SIGNALS_JSON=$(cat data/.signals-latest.json 2>/dev/null || echo "{}")
ALERT_LINES=$("$PYTHON" -c "
import json
s = json.loads('$SIGNALS_JSON') if '$SIGNALS_JSON' != '{}' else {}
alerts = s.get('alerts', [])
for a in alerts:
    if a.get('type') == 'STOP_LOSS':
        print(f'⚠️ {a[\"asset\"]} stop {a[\"currency\"]} {a[\"triggerPrice\"]:.0f} ({a[\"distancePct\"]:.0f}% margen)')
    elif a.get('type') == 'PORTFOLIO_DRAWDOWN':
        print(f'⚠️ Drawdown cartera {a[\"pnlPct\"]:.1f}%')
" 2>/dev/null || true)
ALERTS="$ALERT_LINES"

# Build context for Claude (inline data, no tools needed)
DRAFT=$(cat data/.ledger-draft.md 2>/dev/null || echo "")

PROMPT="makemerich session $SESSION_LABEL ($TODAY). Here is today's data:

---
$DRAFT
---

Trade orders executed by script: $TRADES_EXECUTED. Violations: $VIOLATION_COUNT. Near triggers: $NEAR_TRIGGERS.

YOUR TASK (output ONLY these two lines, nothing else):
ANALYSIS: 2-3 sentences of market analysis in English.
DECISION: One word (HOLD/BUY/SELL) + one-sentence reason in Spanish."

# Call Claude — text-only, no tools, 1 turn
ANALYSIS_TEXT="Session automatica."
DECISION_WORD="HOLD"
DECISION_REASON="sesion automatica, sin analisis de agente"

if [ -x "$CLAUDE_BIN" ]; then
  echo "Delegating to Claude Code CLI (text-only)..."
  export PATH="/home/hustle/.local/bin:/home/hustle/.nvm/versions/node/v25.8.0/bin:$PATH"
  set +e
  CLAUDE_MSG=$(timeout 45 "$CLAUDE_BIN" --model sonnet -p "$PROMPT" --output-format text --max-turns 1 --allowedTools '' 2>>"$LOG_FILE")
  CLAUDE_EXIT=$?
  set -e
  echo "$CLAUDE_MSG"
  if [ $CLAUDE_EXIT -eq 0 ] && [ -n "$CLAUDE_MSG" ]; then
    ANALYSIS_TEXT=$(echo "$CLAUDE_MSG" | grep -oP '(?<=^ANALYSIS: ).*' | head -1 || echo "$ANALYSIS_TEXT")
    DECISION_LINE=$(echo "$CLAUDE_MSG" | grep -oP '(?<=^DECISION: ).*' | head -1 || echo "$DECISION_WORD — $DECISION_REASON")
    DECISION_WORD=$(echo "$DECISION_LINE" | grep -oP '^\S+' | head -1 || echo "HOLD")
    DECISION_REASON=$(echo "$DECISION_LINE" | sed 's/^[A-Z]* — //' | sed 's/^[A-Z]* //' || echo "$DECISION_REASON")
  else
    echo "Claude CLI failed or timed out — using fallback"
  fi
else
  echo "Claude CLI not found — using fallback"
fi

# Append LEDGER entry (with analysis filled in)
DRAFT_FILE="data/.ledger-draft.md"
if [ -f "$DRAFT_FILE" ]; then
  FILLED_DRAFT=$(cat "$DRAFT_FILE")
  FILLED_DRAFT="${FILLED_DRAFT/\{\{ANALYSIS\}\}/$ANALYSIS_TEXT}"
  FILLED_DRAFT="${FILLED_DRAFT/\{\{DECISION\}\}/$DECISION_WORD — $DECISION_REASON}"
  echo "$FILLED_DRAFT" | node scripts/append-ledger.js --stdin 2>&1 || echo "Warning: append-ledger failed"
fi

# Git commit + push
set +e
if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A 2>&1
  git commit -m "log: Day $DAY_NUMBER — $DECISION_WORD, session $SESSION_LABEL ($TODAY)" 2>&1
  git push 2>&1 || echo "Warning: git push failed"
else
  echo "No changes to commit"
fi
set -e

# Send Telegram
send_tg "$(build_telegram_msg "$DECISION_WORD" "$DECISION_REASON" "$ALERTS")"

echo "=== Session $SESSION_LABEL complete ==="
