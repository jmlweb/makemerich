#!/bin/bash
# makemerich - Daily close session (21:30 L-V)
# Flow: fetch → history → portfolio → validate → signals → orders → apply → ledger-draft → agent(analysis) → commit → report
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
TODAY=$(date +%Y-%m-%d)
echo "[$(date)] Starting daily close..." | tee "$LOG_FILE"

# 1. Fetch prices
echo "[1/9] Fetching prices..." | tee -a "$LOG_FILE"
node scripts/fetch-prices.js >> "$LOG_FILE" 2>&1 || { "$VENV_PYTHON" "$SEND_ALERT" "⚠️ makemerich: error fetching prices"; exit 1; }

# 2. Fetch historical OHLCV data
echo "[2/9] Updating historical data..." | tee -a "$LOG_FILE"
node scripts/fetch-history.js >> "$LOG_FILE" 2>&1 || echo "Warning: history fetch failed" >> "$LOG_FILE"

# 3. Update portfolio (recalc at current prices)
echo "[3/9] Updating portfolio..." | tee -a "$LOG_FILE"
node scripts/update-portfolio.js >> "$LOG_FILE" 2>&1 || { "$VENV_PYTHON" "$SEND_ALERT" "⚠️ makemerich: error updating portfolio"; exit 1; }

# 4. Validate rules
echo "[4/9] Validating rules..." | tee -a "$LOG_FILE"
node scripts/validate-rules.js >> "$LOG_FILE" 2>&1 || true

# 5. Generate threshold signals
echo "[5/9] Generating signals..." | tee -a "$LOG_FILE"
node scripts/generate-signals.js >> "$LOG_FILE" 2>&1 || true

# 6. Generate quantitative signals
echo "[6/9] Generating quant signals..." | tee -a "$LOG_FILE"
node scripts/generate-quant-signals.js >> "$LOG_FILE" 2>&1 || echo "Warning: quant signals failed" >> "$LOG_FILE"

# 7. Execute signals — generate binding trade orders
echo "[7/9] Computing trade orders..." | tee -a "$LOG_FILE"
node scripts/execute-signals.js >> "$LOG_FILE" 2>&1 || echo "No trade orders" >> "$LOG_FILE"

# 8. Apply trades to portfolio.json + trades log (mechanical)
echo "[8/9] Applying trades..." | tee -a "$LOG_FILE"
node scripts/apply-trades.js >> "$LOG_FILE" 2>&1 || echo "Warning: apply-trades failed" >> "$LOG_FILE"

# 9. Generate LEDGER draft (data portion only)
echo "[9/9] Generating LEDGER draft..." | tee -a "$LOG_FILE"
LEDGER_DRAFT=$(node scripts/generate-ledger-entry.js --date "$TODAY" 2>>"$LOG_FILE")
echo "$LEDGER_DRAFT" >> "$LOG_FILE"

# --- Read state for fallback and agent ---
BALANCE=$("$VENV_PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"balance_eur\"]:.2f}')" 2>/dev/null || echo "?")
PNL=$("$VENV_PYTHON" -c "import json; p=json.load(open('data/portfolio.json')); print(f'{p[\"totals\"][\"pnl_pct\"]:.1f}')" 2>/dev/null || echo "?")
DAY_NUMBER=$("$VENV_PYTHON" -c "import json; d=json.load(open('data/$TODAY.json')); print(d['day'])" 2>/dev/null || echo "?")

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

# Claude's ONLY job: text-only — produce analysis + decision (no Telegram, no tools)
DRAFT=$(cat data/.ledger-draft.md 2>/dev/null || echo "")
PROMPT="makemerich DAILY CLOSE $TODAY. Here is today's LEDGER draft with all data:

---
$DRAFT
---

YOUR TASK (output ONLY these two lines, nothing else):
ANALYSIS: 2-3 sentences of market analysis in English.
DECISION: One word (HOLD/BUY/SELL) + one-sentence reason in Spanish."

# Build Telegram message from portfolio data + decision (no Claude needed)
build_telegram_msg() {
  local decision="$1"
  local reason="$2"
  local decision_emoji="📈"
  if echo "$PNL" | grep -q "^-"; then decision_emoji="📉"; fi

  local prev_balance
  prev_balance=$("$VENV_PYTHON" -c "
import json, glob
files = sorted(glob.glob('data/2026-*.json'))
today_f = 'data/$TODAY.json'
prev = [f for f in files if f < today_f]
if prev: print(json.load(open(prev[-1]))['balance']['total'])
else: print('$BALANCE')
" 2>/dev/null || echo "$BALANCE")
  local day_change
  day_change=$("$VENV_PYTHON" -c "print(f'{$BALANCE - $prev_balance:.0f}')" 2>/dev/null || echo "0")
  local day_change_pct
  day_change_pct=$("$VENV_PYTHON" -c "print(f'{($BALANCE - $prev_balance) / $prev_balance * 100:.1f}')" 2>/dev/null || echo "0")

  local sign=""
  if [ "$(echo "$day_change" | grep -c "^-")" -eq 0 ]; then sign="+"; fi

  # Build alerts from signals
  local alerts
  alerts=$("$VENV_PYTHON" -c "
import json
s = json.load(open('data/.signals-latest.json'))
for a in s.get('alerts', []):
    if a.get('type') == 'STOP_LOSS':
        print(f'⚠️ {a[\"asset\"]} stop {a[\"currency\"]} {a[\"triggerPrice\"]:.0f} ({a[\"distancePct\"]:.0f}% margen)')
    elif a.get('type') == 'PORTFOLIO_DRAWDOWN':
        print(f'⚠️ Drawdown cartera {a[\"pnlPct\"]:.1f}%')
" 2>/dev/null || true)

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

fill_and_append_ledger() {
  local analysis="$1"
  local decision="$2"
  local draft
  draft=$(cat data/.ledger-draft.md 2>/dev/null || echo "")
  if [ -n "$draft" ]; then
    draft="${draft/\{\{ANALYSIS\}\}/$analysis}"
    draft="${draft/\{\{DECISION\}\}/$decision}"
    echo "$draft" | node scripts/append-ledger.js --stdin >> "$LOG_FILE" 2>&1
  fi
}

# --- Agent: analysis only (pure text, no tools) ---
ANALYSIS_TEXT="Automated close — agent unavailable."
DECISION_WORD="HOLD"
DECISION_REASON="cierre automatico, sin analisis de agente"

if [ -x "$CLAUDE_BIN" ]; then
  echo "Delegating to Claude Code CLI (text-only)..." | tee -a "$LOG_FILE"
  export PATH="/home/hustle/.local/bin:/home/hustle/.nvm/versions/node/v25.8.0/bin:$PATH"
  set +e
  CLAUDE_MSG=$(timeout 90 "$CLAUDE_BIN" --model sonnet -p "$PROMPT" --output-format text --max-turns 1 --allowedTools '' 2>>"$LOG_FILE")
  CLAUDE_EXIT=$?
  set -e
  echo "$CLAUDE_MSG" >> "$LOG_FILE"
  if [ $CLAUDE_EXIT -eq 0 ] && [ -n "$CLAUDE_MSG" ]; then
    ANALYSIS_TEXT=$(echo "$CLAUDE_MSG" | grep -oP '(?<=^ANALYSIS: ).*' | head -1 || echo "$ANALYSIS_TEXT")
    DECISION_LINE=$(echo "$CLAUDE_MSG" | grep -oP '(?<=^DECISION: ).*' | head -1 || echo "$DECISION_WORD — $DECISION_REASON")
    DECISION_WORD=$(echo "$DECISION_LINE" | grep -oP '^\S+' | head -1 || echo "HOLD")
    DECISION_REASON=$(echo "$DECISION_LINE" | sed 's/^[A-Z]* — //' | sed 's/^[A-Z]* //' || echo "$DECISION_REASON")
  else
    echo "Claude CLI failed or timed out — using fallback" | tee -a "$LOG_FILE"
  fi
else
  echo "Claude CLI not found — using fallback" | tee -a "$LOG_FILE"
fi

# Append completed LEDGER entry (always — even if agent failed, uses fallback text)
fill_and_append_ledger "$ANALYSIS_TEXT" "$DECISION_WORD — $DECISION_REASON"

# --- Post-agent: git commit + push ---
echo "Committing and pushing..." | tee -a "$LOG_FILE"
set +e
if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A >> "$LOG_FILE" 2>&1
  git commit -m "log: Day $DAY_NUMBER — $DECISION_WORD, portfolio summary ($TODAY)" >> "$LOG_FILE" 2>&1
  git push >> "$LOG_FILE" 2>&1 \
    || echo "Warning: git push failed" | tee -a "$LOG_FILE"
else
  echo "No changes to commit" | tee -a "$LOG_FILE"
fi
set -e

# --- Post-agent: send Telegram (built from template, no Claude) ---
TELEGRAM_MSG=$(build_telegram_msg "$DECISION_WORD" "$DECISION_REASON")
"$VENV_PYTHON" "$SEND_ALERT" "$TELEGRAM_MSG"

echo "[$(date)] Daily close complete." | tee -a "$LOG_FILE"
