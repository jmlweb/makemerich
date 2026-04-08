#!/bin/bash
# MakeMeRich - Pre-session summary (read-only)
#
# Reads pre-computed data files and displays a summary.
# Data is kept fresh by cron sessions (09, 12, 15:30, 18, 21:30).
# Zero fetches, zero token waste.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

PYTHON="/home/hustle/.config/hustle/venv/bin/python3"
PRICES="data/.prices-latest.json"
SIGNALS="data/.signals-latest.json"
QUANT="data/.quant-signals-latest.json"
PORTFOLIO="data/portfolio.json"
TODAY=$(date +%Y-%m-%d)
TODAY_FILE="data/$TODAY.json"

echo "=== MakeMeRich Pre-Session ==="
echo "$(date '+%Y-%m-%d %H:%M:%S %Z')"

# Check data freshness
if [ -f "$PRICES" ]; then
  FETCHED=$("$PYTHON" -c "
import json
from datetime import datetime, timezone
d = json.load(open('$PRICES'))
t = datetime.fromisoformat(d['fetchedAt'].replace('Z','+00:00'))
age = (datetime.now(timezone.utc) - t).total_seconds() / 60
print(f'{age:.0f}')
" 2>/dev/null || echo "?")
  echo "Data age: ${FETCHED}min"
else
  echo "WARNING: No price data found. Run: bash scripts/pre-session.sh"
  exit 0
fi
echo ""

# Prices
echo "[Prices]"
"$PYTHON" -c "
import json
d = json.load(open('$PRICES'))
p = d['prices']
print(f'EUR/USD: {d[\"eurUsd\"]:.4f}')
print()
for sym in ['ETH', '4GLD', 'XEON']:
    if sym in p:
        a = p[sym]
        usd = a.get('priceUSD', 0)
        eur = a.get('priceEUR', 0)
        chg = float(a.get('change', 0))
        sign = '+' if chg >= 0 else ''
        print(f'{sym}: \${usd:.2f} / EUR {eur:.2f} ({sign}{chg:.2f}%)')
print()
for idx in ['SP500', 'NASDAQ', 'GOLD', 'IBEX35', 'EUROSTOXX50', 'DAX']:
    if idx in p:
        a = p[idx]
        val = a.get('value', 0)
        chg = float(a.get('change', 0))
        sign = '+' if chg >= 0 else ''
        print(f'{idx}: {val:.2f} ({sign}{chg:.2f}%)')
" 2>/dev/null || echo "(prices unavailable)"
echo ""

# Portfolio
echo "[Portfolio]"
"$PYTHON" -c "
import json, os
p = json.load(open('$PORTFOLIO'))
t = p['totals']
print(f'Balance: EUR {t[\"balance_eur\"]:.2f} ({t[\"pnl_pct\"]:+.1f}%)')
if os.path.exists('$TODAY_FILE'):
    d = json.load(open('$TODAY_FILE'))
    print(f'Day {d[\"day\"]}')
print()
for k, v in sorted(p['holdings'].items(), key=lambda x: -x[1].get('amount_eur', 0)):
    if k == 'CASH':
        print(f'  CASH  EUR {v[\"amount_eur\"]:.0f}')
    else:
        amt = v.get('amount_eur', 0)
        pnl = v.get('pnl_pct', 0)
        print(f'  {k:<5} EUR {amt:>6.0f}  {pnl:+.1f}%')
" 2>/dev/null || echo "(portfolio unavailable)"
echo ""

# Signals & alerts
echo "[Signals]"
"$PYTHON" -c "
import json
s = json.load(open('$SIGNALS'))
print(f'Balance: EUR {s[\"balance\"]:.2f} ({s[\"totalReturn\"]:+.1f}%)')
print()
alerts = s.get('alerts', [])
near = [a for a in alerts if a.get('status') in ('NEAR_TRIGGER', 'WARNING')]
active = [a for a in alerts if a.get('status') == 'ACTIVE']
if near:
    print('NEAR TRIGGER:')
    for a in near:
        if a['type'] == 'PORTFOLIO_DRAWDOWN':
            print(f'  PORTFOLIO: {a[\"detail\"]}')
        else:
            print(f'  {a[\"asset\"]} [{a[\"type\"]}] {a[\"currency\"]} {a[\"currentPrice\"]:.2f} -> stop {a[\"triggerPrice\"]} ({a[\"distancePct\"]:.1f}% away)')
    print()
if active:
    print('ACTIVE MONITORS:')
    for a in active:
        print(f'  {a[\"asset\"]} [{a[\"type\"]}] {a[\"currency\"]} {a[\"currentPrice\"]:.2f} -> stop {a[\"triggerPrice\"]} ({a[\"distancePct\"]:.1f}% away)')
    print()
" 2>/dev/null || echo "(signals unavailable)"

# Quant signals summary
echo "[Quant Signals]"
"$PYTHON" -c "
import json
q = json.load(open('$QUANT'))
mr = q['marketRegime']
print(f'Regime: {mr[\"regime\"].upper()} (SP500 {mr[\"sp500vsSma50Pct\"]:+.2f}% vs SMA50, VIX {mr[\"vix\"]})')
buy, hold, sell = [], [], []
for sym, a in q['assets'].items():
    rec = a.get('recommendation', 'HOLD')
    if rec == 'BUY': buy.append(sym)
    elif rec == 'SELL': sell.append(sym)
    else: hold.append(sym)
if buy: print(f'BUY: {\", \".join(buy)}')
if sell: print(f'SELL: {\", \".join(sell)}')
if hold: print(f'HOLD: {\", \".join(hold)}')
" 2>/dev/null || echo "(quant signals unavailable)"
echo ""

echo "=== Ready for Hustle ==="
