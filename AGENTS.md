# Agent Instructions

## Document Hierarchy

When documents conflict, authority flows top-down:

1. **RULES.md** — Immutable game rules. Position limits are absolute and cannot be overridden
2. **STRATEGY.md** — Investment philosophy + active mandates
3. **HUSTLE.md** — Decision criteria (quantitative signals only, no narrative trading)
4. **This file (AGENTS.md)** — Operational workflow, schedule, tooling

> **Important (2026-04-07):** No mandate in STRATEGY.md may suspend RULES.md position limits. This was changed after the Aggressive Maximization mandate caused a -15% drawdown.

---

## Language Rule

**All documentation, commits, and logs must be in English.**
Only exception: direct messages to Jose (Spanish is fine).

---

## Project Files

| File | Purpose | Update frequency |
|------|---------|-----------------|
| [RULES.md](RULES.md) | Game rules | **Never** (fixed) |
| [STRATEGY.md](STRATEGY.md) | Investment philosophy + mandates | When strategy changes |
| [HUSTLE.md](HUSTLE.md) | Decision criteria (entry/exit/sizing) | When process changes |
| [SIGNALS.md](SIGNALS.md) | Active signals, alerts, and watchlist | Each session |
| [LEDGER.md](LEDGER.md) | Daily log (public) | Daily 21:30 |
| [LEARNINGS.md](LEARNINGS.md) | Lessons learned | When something notable happens |
| [ASSETS.md](ASSETS.md) | Allowed instruments | When adding options |
| [README.md](README.md) | Public overview | Daily |

### Data Files

| File | Purpose | Update frequency |
|------|---------|-----------------|
| `data/portfolio.json` | Current portfolio state | Each session |
| `data/trades/YYYY-MM.json` | Transaction log | On each trade |
| `data/summary.json` | Monthly totals | End of day |
| `data/.prices-latest.json` | Price cache | Each fetch |
| `data/history/{SYMBOL}.json` | Historical OHLCV (1y) | Each session (cached) |
| `data/.quant-signals-latest.json` | Quantitative signals | Each session |
| `data/.trade-orders.json` | Binding trade orders | Each session |

---

## Schedule (Mon-Fri, Europe/Madrid)

| Time | Cron | Action |
|------|------|--------|
| 09:00 | makemerich-0900 | Europe open — full analysis |
| 12:00 | makemerich-1200 | Quick midday check |
| 15:30 | makemerich-1530 | US open — opportunities |
| 18:00 | makemerich-1800 | Mid-session check |
| 21:30 | makemerich-2130 | **Close — LEDGER mandatory** |

> Weekends: Crypto check only (24/7 market)

---

## Order of Operations

```
1. Fetch prices          -> node scripts/fetch-prices.js
2. Fetch history         -> node scripts/fetch-history.js
3. Update portfolio      -> node scripts/update-portfolio.js
4. Check alerts          -> node scripts/check-alerts.js
5. Generate signals      -> node scripts/generate-signals.js
6. Generate quant signals -> node scripts/generate-quant-signals.js
7. Compute trade orders  -> node scripts/execute-signals.js
8. Execute orders        -> ONLY execute what execute-signals.js outputs
9. If 21:30              -> Update LEDGER, commit, push
```

> **Critical:** Step 8 is mechanical. The agent executes the orders from step 7 — it does NOT analyze the market or override signals with its own judgment. If there are no orders, the action is HOLD.

---

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| ETF prices (SXR8, VWCE, DXS3, NATO, 4GLD, XEON) | Yahoo Finance | `web_fetch stockanalysis.com` |
| Crypto (BTC, ETH) | Coinbase | `web_fetch api.coinbase.com` |
| Fear & Greed | CNN | `web_search "fear greed index"` |
| News | Reuters, CNBC | `web_search "[topic] news"` |
| Indices | Various | `node scripts/fetch-prices.js` |

---

## Available Scripts

```bash
# Core pipeline (run in order via pre-session.sh)
node scripts/fetch-prices.js            # Get current prices from Yahoo Finance
node scripts/fetch-history.js           # Fetch/cache 1y OHLCV data for all assets
node scripts/update-portfolio.js        # Update portfolio with current prices
node scripts/check-alerts.js            # Check stop-loss/take-profit alerts
node scripts/generate-signals.js        # Generate threshold-based signals
node scripts/generate-quant-signals.js  # Generate quantitative BUY/SELL/HOLD signals
node scripts/execute-signals.js         # Convert quant signals into binding trade orders
node scripts/validate-rules.js          # Validate portfolio against RULES.md

# Analysis & reporting
node scripts/analyze-portfolio.js       # Portfolio analytics (volatility, Sharpe, correlation)
node scripts/backtest.js                # Backtest signal strategy against historical data
node scripts/calculate-balance.js       # Calculate current balance
node scripts/generate-entry.js          # Generate LEDGER entry template
node scripts/generate-dashboard.js      # Generate HTML dashboard
node scripts/rebalance-suggester.js     # Suggest rebalancing

# Orchestration
bash scripts/pre-session.sh             # Full pre-session prep (all core pipeline scripts)
bash scripts/daily-update.sh            # Daily close (21:30) — pipeline + agent + commit
```

---

## Subagents

| Agent | Role | Model | Invocation |
|-------|------|-------|------------|
| `analyst` | Market analysis, signals, recommendations | haiku | `@analyst` or auto-delegated |
| `scribe` | Documentation sync (LEDGER, SIGNALS) | haiku | `@scribe` or auto-delegated |

Defined in `.claude/agents/`.

---

## Alerts

Notify Jose immediately if:

| Condition | Channel | Urgency |
|-----------|---------|---------|
| Position at stop loss (-15%) | Telegram | High |
| Portfolio -10% from start | Telegram | High |
| Portfolio +20% from start | Telegram | High |
| Balance < EUR 1,000 | Telegram | Critical |
| Strong entry signal | Telegram | Medium |
| Script error | Telegram | Medium |

---

## Commit Convention

```
Day N: [main action or HOLD]
```

Examples:
- `Day 3: HOLD - BTC volatile, waiting`
- `Day 4: BUY EQQQ 10% - RSI oversold`
- `Day 5: SELL ETH 25% - Take profit`

---

## Monthly Audit (1st session of each month)

Review all non-daily docs for accuracy:
- [ ] README.md — balance, positions, dates
- [ ] ASSETS.md — instruments match current holdings
- [ ] RULES.md — position limits table current
- [ ] SIGNALS.md — alerts match `.signals-latest.json` and `.quant-signals-latest.json`
- [ ] STRATEGY.md — mandates still active
- [ ] Run `node scripts/backtest.js --all` — verify strategy still outperforms or explain why not
- [ ] dashboard.html — not stale

---

*See [HUSTLE.md](HUSTLE.md) for detailed entry/exit decision criteria.*
