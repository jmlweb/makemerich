# Agent Instructions

## Document Hierarchy

When documents conflict, authority flows top-down:

1. **RULES.md** — Immutable game rules (only overridden by explicit mandate in STRATEGY.md)
2. **STRATEGY.md** — Investment philosophy + active mandates/overrides
3. **HUSTLE.md** — Decision criteria (entry/exit/sizing)
4. **This file (AGENTS.md)** — Operational workflow, schedule, tooling

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
1. Fetch prices       -> node scripts/fetch-prices.js
2. Update portfolio   -> node scripts/update-portfolio.js
3. Check alerts       -> node scripts/check-alerts.js
4. Review SIGNALS.md  -> Any active signal?
5. Decide             -> HOLD / BUY / SELL (see HUSTLE.md for criteria)
6. If trade           -> Record in trades.json, update SIGNALS.md
7. If 21:30           -> Update LEDGER, commit, push
```

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
node scripts/fetch-prices.js        # Get current prices
node scripts/update-portfolio.js     # Update portfolio with current prices
node scripts/check-alerts.js         # Check alerts (stop loss, take profit)
node scripts/rebalance-suggester.js  # Suggest rebalancing
node scripts/calculate-balance.js    # Calculate current balance
node scripts/generate-entry.js       # Generate LEDGER entry
node scripts/analyze-portfolio.js    # Analyze portfolio
node scripts/generate-dashboard.js   # Generate dashboard
node scripts/validate-rules.js       # Validate portfolio against RULES.md
node scripts/generate-signals.js     # Generate signals
bash scripts/pre-session.sh          # Run full pre-session prep (all above)
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
- [ ] RULES.md — override table current
- [ ] SIGNALS.md — no stale entries
- [ ] STRATEGY.md — mandates still active
- [ ] dashboard.html — not stale

---

*See [HUSTLE.md](HUSTLE.md) for detailed entry/exit decision criteria.*
