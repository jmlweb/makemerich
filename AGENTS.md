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
| [FINDINGS.md](FINDINGS.md) | Data-integrity and rule-enforcement findings, corrections to append-only history | When a defect is found or fixed |
| [CLAUDE.md](CLAUDE.md) | Operating manual for interactive maintenance sessions | When invariants or failure modes change |
| [ASSETS.md](ASSETS.md) | Allowed instruments | When adding options |
| [README.md](README.md) | Public overview | Daily |

### Data Files

| File | Purpose | Update frequency |
|------|---------|-----------------|
| `data/portfolio.json` | Current portfolio state | Each session |
| `data/trades/YYYY-MM.json` | Transaction log | On each trade |
| `data/.prices-latest.json` | Price cache | Each fetch |
| `data/history/{SYMBOL}.json` | Historical OHLCV (1y) | Each session (cached) |
| `data/.quant-signals-latest.json` | Quantitative signals | Each session |
| `data/.trade-orders.json` | Binding trade orders | Each session |
| `data/summary.json` | Monthly + all-time totals | Daily close (`generate-summary.js`) |
| `data/.daily-summary.txt` | Telegram notification block | Daily close (`generate-summary.js`) |
| `data/.ticker-aliases.json` | Legacy → canonical ticker map | When an instrument is renamed |

---

## Trade Log Schema (canonical)

`data/trades/YYYY-MM.json` is a **bare JSON array** of trade objects (one file per
month). This is the format `apply-trades.js` writes; all months use it. Do **not**
wrap it in `{ "month": ..., "trades": [...] }` — that legacy shape is deprecated.

```jsonc
[
  {
    "date": "2026-02-04",        // YYYY-MM-DD
    "time": "19:20 UTC",         // HH:MM UTC
    "action": "BUY",             // BUY | SELL | deposit
    "asset": "GLD",              // ticker (record under the ticker held at the time)
    "units": 0.91,               // omitted for deposits
    "price_usd": 453.89,         // price in native currency: price_usd OR price_eur
    "amount_eur": 350.0,         // gross trade value in EUR
    "fee_eur": 0,                // fee in EUR (0 if not recorded)
    "reason": "…",               // free text
    "session": "makemerich-2130" // cron session id, or "seed"/"reconstructed"
  }
]
```

**Ticker renames:** instruments were migrated over time (VOO→SXR8, QQQ→EQQQ,
GLD→SGLD→4GLD). Trades stay recorded under the ticker that was held at trade time.
`data/.ticker-aliases.json` (`resolve` map) collapses legacy tickers to the current
canonical symbol so trades and holdings reconcile across renames.

---

## Schedule (Europe/Madrid)

The trigger lives **outside this repo**: hustle BullMQ workers (`apps/core/src/workers/create-workers.ts`) call the shell scripts below. There is no crontab entry. If a run is missing, see the `session-recovery` skill.

| Time | Script | Action |
|------|--------|--------|
| 09:00, 12:00, 15:30, 18:00 Mon–Fri | `scripts/session.sh <label>` | Full quant pipeline, apply orders; commits (`git add -A`) whenever the tree differs from HEAD, i.e. every run. LEDGER entry only if trades executed |
| 21:30 Mon–Fri | `scripts/daily-update.sh` | **Close** — pipeline, LEDGER entry, validation gate, commit + push, Telegram summary |
| Every 5 min, 07:00–23:00 | `scripts/stoploss-watch.sh` | Stop-loss exits and +30%/+50% partial take-profit; auto-commits on action |
| Weekends | `scripts/session.sh weekend` | Crypto check (24/7 market) |

> Trade records written by `apply-trades.js` are all labeled `makemerich-2130` regardless of session (FINDINGS.md 2026-10-18 A8). Use the `time` field to tell sessions apart.

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
8. Execute orders        -> node scripts/apply-trades.js (then update-portfolio.js again if tradesExecuted > 0)
9. If 21:30              -> generate-summary.js, LEDGER entry, validate-data.js gate, commit, push
```

> **Critical:** Step 8 is mechanical and done by `apply-trades.js`, not by an agent. The Claude CLI call in the pipeline is text-only (`--max-turns 1 --allowedTools ''`, `timeout 90`, hardcoded fallback) and only writes the decision/analysis prose. It does NOT analyze the market into trades or override signals. If there are no orders, the action is HOLD.

---

## Data Sources

| Data | Source | Method |
|------|--------|--------|
| Prices: ETFs, ETCs, EU stocks, crypto, indices, VIX | Yahoo Finance chart API | `node scripts/fetch-prices.js` → `data/.prices-latest.json` |
| Historical OHLCV (1y) | Yahoo Finance chart API | `node scripts/fetch-history.js` → `data/history/{SYMBOL}.json` |
| EUR/USD | exchangerate-api.com | `node scripts/fetch-prices.js` |

> No news, Fear & Greed, or web search feeds the pipeline. Signals are computed only from price history (see `generate-quant-signals.js`). Adding a non-price input to trading would be a strategy change.

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
node scripts/validate-data.js           # Validate data integrity (continuity, accounting, trades↔holdings) — gates daily commit

# Analysis & reporting
node scripts/analyze-portfolio.js       # Portfolio analytics (volatility, Sharpe, correlation)
node scripts/backtest.js                # Backtest signal strategy against historical data
node scripts/calculate-balance.js       # Calculate current balance
node scripts/generate-summary.js        # Regenerate summary.json + .daily-summary.txt from daily files
node scripts/generate-entry.js          # Generate LEDGER entry template
node scripts/generate-dashboard.js      # Generate HTML dashboard
node scripts/rebalance-suggester.js     # Suggest rebalancing

# Execution & logging (pipeline-owned — do not run by hand, see CLAUDE.md failure mode 6)
node scripts/apply-trades.js            # Apply .trade-orders.json to portfolio.json + append to trades/YYYY-MM.json
node scripts/generate-ledger-entry.js   # Build the LEDGER entry body from portfolio data
node scripts/append-ledger.js           # Prepend the entry to LEDGER.md (append-only history)
node scripts/update-readme.js           # Regenerate README metrics + chart (run by hooks/pre-commit)
node scripts/_send-telegram.js "<msg>"  # Telegram helper; reads credentials from env / ~/.secrets

# Orchestration
bash scripts/session.sh <label>         # Intraday session (09:00/12:00/15:30/18:00, weekend) — pipeline + apply + commit if changed
bash scripts/daily-update.sh            # Daily close (21:30) — pipeline + LEDGER + validation gate + commit + push
bash scripts/stoploss-watch.sh          # Stop-loss / take-profit watcher (every 5 min, 07:00–23:00)
bash scripts/pre-session.sh             # Data refresh: fetch, update-portfolio, signals, orders, summary — WRITES portfolio.json, daily file, caches (does not apply trades)
bash scripts/pre-session-summary.sh     # Read-only SessionStart hook summary (.claude/settings.json)
node scripts/setup-hooks.js             # Install hooks/pre-commit into .git/hooks
```

**Not wired into any pipeline** (manual tools; output may be stale — check before trusting): `analyze-portfolio.js`, `calculate-balance.js`, `generate-entry.js`, `generate-dashboard.js`, `rebalance-suggester.js`, `daily-routine.js` (orphaned since the inline `daily-update.sh` flow replaced it; see FINDINGS.md §3), `simulate-history.js` (one-off replay; its logic is **not** live enforcement — see Rule Enforcement Map).

---

## Subagents

| Agent | Role | Model | Invocation |
|-------|------|-------|------------|
| `analyst` | Market analysis, signals, recommendations | haiku | `@analyst` or auto-delegated |
| `scribe` | Documentation sync (LEDGER, SIGNALS) | haiku | `@scribe` or auto-delegated |

Defined in `.claude/agents/`.

---

## Alerts

What actually reaches Jose (as of 2026-10-18, commit `d446051`):

| Event | Telegram? | Where |
|-------|-----------|-------|
| Daily close summary (balance, decision, alerts block) | Always | `daily-update.sh` |
| `validate-data.js` fails at close → commit/push skipped | Always | `daily-update.sh` |
| Critical pipeline step fails (e.g. `update-portfolio.js`) | Always | `daily-update.sh` `send_tg` |
| Intraday session report | Muted (only with `MAKEMERICH_NOTIFY=1`) | `session.sh` |
| Auto stop-loss / take-profit executed | Muted (only with `MAKEMERICH_NOTIFY=1`). The close message has no "executed" line — its alerts block lists stop *proximity* only; the sale shows only as a changed balance/position | `stoploss-watch.sh` |
| Balance < EUR 1,000 | Reported as a violation by `validate-rules.js` / `check-alerts.js`; no dedicated push | — |

> Because auto-exits are muted, a stop-out is explicitly visible only in git (`auto: stop-loss/take-profit — …` commits), in `/tmp/makemerich-stoploss.log`, and in an on-demand `/makemerich` report.

> **Uncommitted work warning:** `session.sh` and `daily-update.sh` run `git add -A`. Any uncommitted file in the working tree — including interactive doc edits — ships inside the next `log: Day N` pipeline commit to the public repo. Commit or stash interactive work before the next scheduled run.

---

## Rule Enforcement Map

Every documented risk rule → the live code that enforces it. **A rule without a live `script:line` is NOT ENFORCED**, whatever the prose says. `simulate-history.js` does not count. Audited 2026-10-18 (FINDINGS.md "Rule-enforcement audit"); re-verified by the `monthly-audit` skill. Add a row whenever a rule is added.

| Rule | Source | Live enforcement | Status |
|------|--------|------------------|--------|
| Max single position 50% | RULES §4 | `scripts/execute-signals.js:234` caps size at entry; `scripts/validate-rules.js` reports drift | **Entry only** — drift never trimmed (EQQQ > 50% for 99 days, A2) |
| Min 5% reserve (XEON + cash) | RULES §4 | `scripts/execute-signals.js:216` (bare cash only), `scripts/validate-rules.js:68` | **Stricter than rule** — XEON excluded (A5) |
| Max high-risk 30% | RULES §4 | `scripts/execute-signals.js:309` auto-SELL correction | Enforced |
| Max inverse/leveraged 15% | RULES §4 | `scripts/execute-signals.js:284` auto-SELL correction | Enforced |
| Market regime gating (risk-on / risk-off / crisis) | RULES §8, STRATEGY | `scripts/generate-quant-signals.js:44` detects; `scripts/execute-signals.js:198` gates BUYs | Enforced |
| BUY only on quant signal (score ≥ 20) | STRATEGY, HUSTLE | `scripts/generate-quant-signals.js` thresholds; orders only from `scripts/execute-signals.js` | Enforced |
| 2% risk per trade, ATR sizing | HUSTLE sizing | `scripts/execute-signals.js:225`; stop = price − 2×ATR14 (`scripts/generate-quant-signals.js:341`) | Enforced |
| Minimum BUY EUR 50 | (code only) | `scripts/execute-signals.js:257` | Enforced — no SELL minimum (A7) |
| Stop-loss | RULES §6 says −15% from entry | `scripts/stoploss-watch.sh:105` against `stop_loss_eur` set once at BUY (`scripts/apply-trades.js:121`) | **Differs from rule** — live stop is 2×ATR14 at entry — 1.7% (VWCE) to 11.7% (ASML) below entry on current holdings, excluding the 4GLD dust, not −15% |
| Trailing stop −10% from high | RULES §6, HUSTLE | none (only `simulate-history.js`) | **NOT ENFORCED** (A3) |
| Take-profit 25% at +30%, 25% at +50% | RULES §7, HUSTLE | `scripts/stoploss-watch.sh:139,158` | **Buggy** — re-fires daily (A1) |
| Monthly rebalance if drift > 10% | RULES §7 | none | **NOT ENFORCED** |
| Portfolio stop < EUR 1,000 → preservation | RULES §6 | `scripts/validate-rules.js` reports; nothing changes behavior | **Report only** |
| Daily deploy cap 15%, 5-day cap 30% | STRATEGY velocity rules | none (only `simulate-history.js`) | **NOT ENFORCED** (A4) |
| XEON auto-park when cash > 20% | STRATEGY velocity rules | none (only `simulate-history.js`) | **NOT ENFORCED** (A4) |
| 48h cooling-off after a sell | LEARNINGS 2026-03-18 | none | **NOT ENFORCED** (A6) |
| Max 2 trades per week | HUSTLE "Mistakes to Avoid" | none | **NOT ENFORCED** (2026-08-11 had 6 trades) |
| Split deployments > 15% over 2+ sessions | LEARNINGS 2026-02-02 | none | **NOT ENFORCED** |
| Every holdings change has a trade record | CLAUDE invariant 6 | `scripts/validate-data.js` check 5 | Enforced at the 21:30 gate |
| `validate-data.js` passes before any commit touching `data/` | CLAUDE invariant 7 | `scripts/daily-update.sh:200` | **Close only** — `session.sh` and `stoploss-watch.sh` commit ungated (A9) |
| English-only docs | RULES §10 | `monthly-audit` skill language sweep | Audit only |

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
