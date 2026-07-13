#!/bin/bash
# makemerich - Autonomous stop-loss / take-profit watcher
# Runs every 5 minutes from 07:00 to 23:00 via hustle BullMQ.
# Reads stop levels from data/portfolio.json, monitors held assets, triggers
# automatic stop-loss exits and 25% take-profit at +30% / +50%.
# Writes: data/portfolio.json, data/trades/YYYY-MM.json (one record per sale —
# invariant 6), commits and pushes both.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT_DIR="$REPO_DIR/scripts"
PYTHON="${PYTHON:-/usr/bin/python3}"
SEND_TG="$SCRIPT_DIR/_send-telegram.js"
LOG_FILE="/tmp/makemerich-stoploss.log"
ALERT_FILE="/tmp/makemerich-alert.txt"

exec >> "$LOG_FILE" 2>&1

# Load nvm / node for Yahoo Finance fetcher
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd "$REPO_DIR"

"$PYTHON" - "$REPO_DIR" << 'PYEOF'
import json, sys, datetime, subprocess
from pathlib import Path

REPO_DIR = sys.argv[1]
portfolio_path = Path(f"{REPO_DIR}/data/portfolio.json")
prices_path = Path(f"{REPO_DIR}/data/.prices-latest.json")

portfolio = json.loads(portfolio_path.read_text())
holdings = portfolio['holdings']

if not prices_path.exists():
    print(f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S} No prices file — skipping")
    sys.exit(0)

prices_data = json.loads(prices_path.read_text())
fetched_at = datetime.datetime.fromisoformat(prices_data.get('fetchedAt', '2000-01-01'))
age_minutes = (datetime.datetime.now(datetime.timezone.utc) - fetched_at).total_seconds() / 60

MAX_STALE_MINUTES = 120

if age_minutes > MAX_STALE_MINUTES:
    print(f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S} Prices stale ({age_minutes:.0f}m old) — skipping")
    sys.exit(0)

eur_usd = prices_data.get('eurUsd', 0.866)
now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
alerts = []
changed = False


def log_trade(action, asset, units, price_field, price, amount_eur, fee_eur, reason):
    """Append a trade record to data/trades/YYYY-MM.json (invariant: every
    holdings change needs a trade record — validate-data.js check 5)."""
    today = datetime.date.today()
    trades_path = Path(f"{REPO_DIR}/data/trades/{today:%Y-%m}.json")
    trades = json.loads(trades_path.read_text()) if trades_path.exists() else []
    trades.append({
        "date": today.isoformat(),
        "time": datetime.datetime.now(datetime.timezone.utc).strftime('%H:%M') + " UTC",
        "action": action,
        "asset": asset,
        "units": units,
        price_field: price,
        "amount_eur": amount_eur,
        "fee_eur": fee_eur,
        "reason": reason,
        "session": "stoploss-watch",
    })
    trades_path.write_text(json.dumps(trades, indent=2) + "\n")

for asset, data in list(holdings.items()):
    if asset == 'CASH' or asset == 'XEON':
        continue

    price_info = prices_data.get('prices', {}).get(asset)
    if not price_info:
        continue

    stop_eur = data.get('stop_loss_eur')
    stop_usd = data.get('stop_loss_usd')

    if stop_eur is not None:
        current_price = price_info.get('priceEUR') or (price_info.get('priceUSD', 0) * eur_usd)
        stop = stop_eur
        currency = 'EUR'
    elif stop_usd is not None:
        current_price = price_info.get('priceUSD', 0)
        stop = stop_usd
        currency = 'USD'
    else:
        print(f"{now} {asset}: no stop defined — skipping")
        continue

    if current_price <= 0:
        continue

    distance_pct = ((current_price - stop) / current_price) * 100

    if current_price <= stop:
        units = data.get('units', data.get('shares', 0))
        value_eur = data.get('amount_eur', 0)

        fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL') else 0.001
        fee = round(value_eur * fee_rate, 2)
        net = round(value_eur - fee, 2)

        holdings['CASH']['amount_eur'] = round(holdings['CASH']['amount_eur'] + net, 2)
        del holdings[asset]
        changed = True

        price_field = 'price_usd' if currency == 'USD' else 'price_eur'
        log_trade('SELL', asset, units, price_field, round(current_price, 4),
                  round(value_eur, 2), fee,
                  f"Stop-loss triggered: {asset} {currency} {current_price:,.2f} <= stop {currency} {stop:,.2f}")

        alerts.append(
            f"🔴 {asset} STOP LOSS @ {currency} {current_price:,.2f} "
            f"(trigger {currency} {stop:,.2f}) — vendido EUR {net} (fee EUR {fee})"
        )
        print(f"{now} {asset} STOP LOSS TRIGGERED @ {currency} {current_price:.2f} (stop {stop:.2f})")
    elif distance_pct < 3:
        print(f"{now} {asset}={currency}{current_price:.2f} stop={stop:.2f} NEAR ({distance_pct:.1f}%)")
    else:
        print(f"{now} {asset}={currency}{current_price:.2f} stop={stop:.2f} ok ({distance_pct:.1f}%)")

# Take profit checks
tp_actions = []
for asset, data in list(holdings.items()):
    if asset == 'CASH' or asset == 'XEON':
        continue
    pnl = data.get('pnl_pct', 0)

    if pnl >= 50:
        flag = Path(f"/tmp/makemerich-tp50-{asset}-{datetime.date.today()}")
        if not flag.exists():
            units = data.get('units', data.get('shares', 0))
            sell_units = round(units * 0.25, 6)
            sell_value = round(data.get('amount_eur', 0) * 0.25, 2)
            fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL') else 0.001
            fee = round(sell_value * fee_rate, 2)
            net = round(sell_value - fee, 2)
            data['units'] = round(units - sell_units, 6)
            data['amount_eur'] = round(data['amount_eur'] - sell_value, 2)
            holdings['CASH']['amount_eur'] = round(holdings['CASH']['amount_eur'] + net, 2)
            log_trade('SELL', asset, sell_units, 'price_eur',
                      round(sell_value / sell_units, 4) if sell_units else 0,
                      sell_value, fee,
                      f"Take-profit 25% at +{pnl:.1f}% (>= +50% threshold)")
            tp_actions.append(f"🟢 {asset} TAKE PROFIT 25% @ +{pnl:.1f}% — +EUR {net}")
            flag.touch()
            changed = True
    elif pnl >= 30:
        flag = Path(f"/tmp/makemerich-tp30-{asset}-{datetime.date.today()}")
        if not flag.exists():
            units = data.get('units', data.get('shares', 0))
            sell_units = round(units * 0.25, 6)
            sell_value = round(data.get('amount_eur', 0) * 0.25, 2)
            fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL') else 0.001
            fee = round(sell_value * fee_rate, 2)
            net = round(sell_value - fee, 2)
            data['units'] = round(units - sell_units, 6)
            data['amount_eur'] = round(data['amount_eur'] - sell_value, 2)
            holdings['CASH']['amount_eur'] = round(holdings['CASH']['amount_eur'] + net, 2)
            log_trade('SELL', asset, sell_units, 'price_eur',
                      round(sell_value / sell_units, 4) if sell_units else 0,
                      sell_value, fee,
                      f"Take-profit 25% at +{pnl:.1f}% (>= +30% threshold)")
            tp_actions.append(f"🟢 {asset} TAKE PROFIT 25% @ +{pnl:.1f}% — +EUR {net}")
            flag.touch()
            changed = True

if changed:
    total = sum(v.get('amount_eur', 0) if k != 'CASH' else v['amount_eur'] for k, v in holdings.items())
    portfolio['totals']['balance_eur'] = round(total, 2)
    portfolio['totals']['pnl_eur'] = round(total - 5000, 2)
    portfolio['totals']['pnl_pct'] = round((total - 5000) / 5000 * 100, 2)
    portfolio['last_updated'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    portfolio_path.write_text(json.dumps(portfolio, indent=2))

    msg = '\n'.join(alerts + tp_actions)
    subprocess.run(['git', '-C', REPO_DIR, 'add', 'data/portfolio.json', 'data/trades/'])
    subprocess.run(['git', '-C', REPO_DIR, 'commit', '-m', f'auto: stop-loss/take-profit — {msg[:80]}'])
    subprocess.run(['git', '-C', REPO_DIR, 'push'])
    with open('/tmp/makemerich-alert.txt', 'w') as f:
        f.write(msg)
else:
    import os
    if os.path.exists('/tmp/makemerich-alert.txt'):
        os.remove('/tmp/makemerich-alert.txt')
PYEOF

if [ -f "$ALERT_FILE" ]; then
  MSG=$(cat "$ALERT_FILE")
  node "$SEND_TG" "🚨 *Accion automatica*

${MSG}" || echo "Warning: telegram send failed"
fi
