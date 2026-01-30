# Agent Instructions

> **For HAL:** See [HAL.md](HAL.md) for detailed workflow.

---

## Project Files

| File | Purpose | Update |
|------|---------|--------|
| [HAL.md](HAL.md) | **Complete operating manual** | When process changes |
| [SIGNALS.md](SIGNALS.md) | **Active signals and alerts** | Each session |
| [WATCHLIST.md](WATCHLIST.md) | **Assets under surveillance** | When watchlist changes |
| [LEDGER.md](LEDGER.md) | Daily log (public) | Daily 21:30 |
| [STRATEGY.md](STRATEGY.md) | Investment philosophy | When strategy changes |
| [LEARNINGS.md](LEARNINGS.md) | Lessons learned | When something notable happens |
| [RULES.md](RULES.md) | Game rules | **Never** (fixed) |
| [ASSETS.md](ASSETS.md) | Allowed instruments | When adding options |
| [README.md](README.md) | Public overview + chart | Daily |

### Data Files

| File | Purpose | Update |
|------|---------|--------|
| `data/portfolio.json` | Current portfolio state | Each session |
| `data/trades/YYYY-MM.json` | Transaction log | On each trade |
| `data/summary.json` | Monthly totals | End of day |
| `data/.prices-latest.json` | Price cache | Each fetch |

---

## Workflow

### Key Sessions (Mon-Fri)

| Time | Cron | Action |
|------|------|--------|
| 09:00 | makemerich-0900 | Europe open - full analysis |
| 12:00 | makemerich-1200 | Quick midday check |
| 15:30 | makemerich-1530 | US open - opportunities |
| 18:00 | makemerich-1800 | Mid-session check |
| 21:30 | makemerich-2130 | **Close - LEDGER mandatory** |

### Order of Operations

```
1. Fetch prices       → node scripts/fetch-prices.js
2. Update portfolio   → node scripts/update-portfolio.js
3. Check alerts       → node scripts/check-alerts.js
4. Review SIGNALS.md  → Any active signal?
5. Decide             → HOLD / BUY / SELL
6. If trade           → Record in trades.json
7. If 21:30           → Update LEDGER, commit, push
```

---

## Alerts

Notify Jose immediately if:

| Condition | Channel | Urgency |
|-----------|---------|---------|
| Position at stop loss (-15%) | Telegram | 🔴 High |
| Portfolio -10% from start | Telegram | 🔴 High |
| Portfolio +20% from start | Telegram | 🟢 High |
| Balance < €1,000 | Telegram | 🔴 Critical |
| Strong entry signal | Telegram | 🟡 Medium |
| Script error | Telegram | 🟡 Medium |

---

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| ETFs (VOO, QQQ) | Yahoo Finance | `web_fetch stockanalysis.com` |
| Crypto (BTC, ETH) | Coinbase | `web_fetch api.coinbase.com` |
| Fear & Greed | CNN | `web_search "fear greed index"` |
| News | Reuters, CNBC | `web_search "[topic] news"` |
| Indices | Various | Script fetch-prices.js |

---

## Available Scripts

```bash
# Get current prices
node scripts/fetch-prices.js

# Update portfolio with current prices
node scripts/update-portfolio.js

# Check alerts (stop loss, take profit)
node scripts/check-alerts.js

# Suggest rebalancing
node scripts/rebalance-suggester.js

# Calculate current balance
node scripts/calculate-balance.js

# Generate LEDGER entry
node scripts/generate-entry.js

# Analyze portfolio
node scripts/analyze-portfolio.js

# Generate dashboard
node scripts/generate-dashboard.js
```

---

## Commit Convention

```bash
git add -A
git commit -m "Day N: [main action or HOLD]"
git push
```

Examples:
- `Day 3: HOLD - BTC volatile, waiting`
- `Day 4: BUY QQQ 10% - RSI oversold`
- `Day 5: SELL BTC 25% - Take profit`

---

*See [HAL.md](HAL.md) for detailed decision criteria.*
