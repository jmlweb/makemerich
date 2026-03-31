# 📚 Learnings

Mistakes, successes, and patterns. Updated when something notable happens.

---

## 2026-01-28: Initial Allocation

**Category:** Strategy  
**Impact:** Neutral (baseline)

**What happened:** Started with conservative 60% cash, 25% VOO, 15% BTC.

**Lesson:** High cash reserve (60%) limits upside but provides safety and flexibility to buy dips.

**Action:** Monitor for opportunities to deploy cash if market drops 5%+.

---

## 2026-01-30: System Design Matters

**Category:** Operations  
**Impact:** Process improvement

**What happened:** Initial HUSTLE.md was just a schedule with no decision criteria. Cron payloads were too vague ("check markets"). No clear framework for when to buy/sell.

**Lesson:** Autonomous operation requires explicit decision trees, not just schedules. Vague instructions lead to inconsistent behavior.

**Action:** Created comprehensive HAL.md with entry/exit criteria, SIGNALS.md for active alerts, WATCHLIST.md for tracked assets. Crons now have step-by-step instructions.

---

## 2026-01-30: Separate Tracking Files

**Category:** Operations  
**Impact:** Better organization

**What happened:** Trying to track signals, watchlist, and daily logs in the same mental space was messy.

**Lesson:** Separate concerns: SIGNALS.md for what's actionable NOW, WATCHLIST.md for what to monitor, LEDGER.md for history.

**Action:** Created dedicated files for each purpose.

---

## 2026-01-30: BTC Volatility

**Category:** Strategy  
**Impact:** -€34.41 (-4.59% on position)

**What happened:** BTC dropped from $86,500 to $82,536 in 3 days while VOO only moved -0.59%.

**Lesson:** Crypto is significantly more volatile than broad market ETFs. A 15% allocation can swing the portfolio more than expected.

**Action:** Consider smaller crypto positions (5-10%) or use BTC for tactical trades only, not long-term hold.

---

## 2026-02-02: Don't Deploy All Cash in a Single Session

**Category:** Strategy / Position Sizing  
**Impact:** -7.27% in one day (EUR -361)

**What happened:** On Day 4, the portfolio went from 60% cash to 20% cash in a single session. BTC was sold at -11.2% realized loss (EUR -188) and the proceeds plus existing cash were deployed into VOO, QQQ, and GLD — all on a red day (S&P -0.14%, NASDAQ -0.40%, Gold -1.17%).

**Lesson:** Deploying large amounts of cash in a single session removes the ability to average in at better prices if the market continues falling. Scale in over 2-3 sessions minimum, especially when deploying >20% of the portfolio.

**Rule:** When deploying cash >15% of portfolio, split into at least 2 tranches over 2+ sessions. Exception: clear catalyst with time pressure (e.g., SGLD→4GLD rotation).

---

## 2026-02-06: Legal Compliance in Spain

**Category:** Strategy / Compliance  
**Impact:** Full portfolio restructuring

**What happened:** Jose requested to invest "in the smartest and most legal way in Spain." I discovered that US ETFs (VOO, GLD, QQQ) are technically not accessible to retail investors in Spain/EU due to PRIIPS/MiFID II regulation (missing KID documentation).

**Lesson:** Always verify instrument legality before using them. What works in the US is not always accessible in Spain.

**Action:** 
1. Converted to UCITS ETFs domiciled in Ireland (SXR8, VWCE, SGLD)
2. Added crypto exposure (BTC, ETH) — legal and regulated in Spain
3. Updated scripts to handle EUR and USD assets
4. Documented legal options in ASSETS.md

**Advantages of the switch:**
- 100% legal and compliant
- Better tax withholding (15% vs 30% on US dividends)
- Accumulating ETFs = tax deferral until sale
- Crypto exposure for potential 10x

---

## 2026-03-18: Sell-and-Rebuy Contradicts Itself

**Category:** Strategy / Discipline  
**Impact:** Unnecessary fees + strategic incoherence

**What happened:** On Day 36 (March 18), BTC was sold with +11.59% unrealized gain "to protect capital amid market weakness." On Day 37 (March 19), ~EUR 900 was reinvested back into BTC (0.0065 units at $71,238) and ETH (expanded +66.8%) at similar prices. The sell-and-rebuy within 24 hours generated fees, realized no meaningful gain, and contradicted the original "protect capital" rationale.

**Lesson:** If the thesis on an asset hasn't changed, don't sell to "protect" and rebuy the next day. Either hold through volatility or exit with a clear reason not to re-enter. Selling and rebuying is only justified if the entry price is materially better or the thesis has genuinely changed.

**Rule:** After selling a position, enforce a 48-hour cooling-off period before re-entering the same asset, unless fundamentals have materially changed (not just price action).

---

## 2026-03-27: SGLD vs 4GLD — Instrument Quality Matters

**Category:** Strategy / Instrument Selection  
**Impact:** Reduced FX drag, 0% TER vs 0.12%, better NAV tracking

**What happened:** SGLD (Invesco Physical Gold ETC) showed -9.56% return while spot gold was actually near all-time highs. Investigation revealed three compounding problems: (1) SGLD priced in USD → EUR/USD movements hurt a EUR-based portfolio; (2) LBMA PM auction daily lag means intraday spot moves aren't reflected immediately in SGLD price; (3) 0.12% annual TER slowly erodes returns.

**Lesson:** For EUR-based gold exposure, 4GLD (Xetra-Gold, DE000A0S9GB0) is strictly superior: TER 0%, EUR-denominated, 1g physical gold per unit, trades on Deutsche Börse Xetra. Use 4GLD for gold, not SGLD.

**Action:** Rotated full position SGLD → 4GLD. Also deployed remaining cash into 4GLD given strong gold macro outlook (tariffs, USD weakness, analyst targets $5,000-6,000 Q4 2026).

**Rule added:** When selecting ETFs/ETCs: always check (1) currency denomination vs portfolio currency, (2) TER, (3) tracking methodology. EUR-based portfolio = prefer EUR-denominated instruments.

---

## 2026-03-30: Full Audit — Accounting, Operations, Strategy

**Category:** Operations / Accounting / Strategy  
**Impact:** Balance inflated by EUR 1,206 for days; decisions made on false data

**Root cause:** Two sources of truth (Python scripts vs Node script). The Node script recalculated from `units x current_price`, overwriting manual portfolio.json edits. Additionally, XEON entry price was set to market price (EUR 148.40) instead of actual purchase price (EUR 140.50).

### Impact on position sizing

The inflated balance of EUR 5,457 (vs real EUR 4,250) was the basis for the DXS3, NATO, and XEON trades on Days 44-45. This means those positions were sized assuming EUR 1,200 more capital than actually existed. DXS3 ended up at 36.6% of the real portfolio — a concentration that might have been lower had the true balance been known. Decisions made on false data cannot be undone, but this reinforces the need for automated post-trade validation.

### Rules derived

1. **Verify balance after every trade.** Calculate `sum(holdings)` and compare with reported balance. If they differ by >EUR 1, investigate.
2. **`entry_price` = execution price. Always.** Never use current market price. The valuation script only updates `current_price_eur`; `entry_price` and `units` are immutable after trade.
3. **Single source of truth.** One system owns portfolio state. Others read from it, never overwrite.
4. **Validate before committing.** If balance jumps >5% without an executed trade, there's a bug.
5. **Park idle cash in XEON.** Any cash >15% of portfolio for >48h should move to XEON (3.5% APY).

### Trade-specific lessons

| Trade | Lesson |
|-------|--------|
| SXR8 stop at -16.7% (vs -15% target) | Opening gaps can blow past stops. Reduce position size in high-volatility regimes. |
| NATO at EUR 18.50 (dropped to EUR 16.20) | Don't chase overbought assets. Scale in with reduced sizing (EUR 200 vs EUR 400) after support confirms. |
| XEON deploy (2 days late) | Speed matters when thesis is clear AND instrument is correct. Speed without analysis (NATO) generates losses. |

### Pattern: speed vs. conviction

| Trade | Speed | Result |
|-------|-------|--------|
| SGLD to 4GLD | Fast (clear thesis) | Correct |
| Stops SXR8/VWCE | Automatic | Avoided additional -30% |
| DXS3 pre-Liberation Day | Immediate | To be verified |
| NATO | Immediate but no analysis | Bad timing |

---

## 2026-03-31: Documentation Drift — Silent Staleness

**Category:** Operations / Documentation  
**Impact:** README, ASSETS, dashboard, and RULES all stale or contradictory for weeks

**What happened:** A full audit revealed that only the daily LEDGER was being kept up to date. Everything else had drifted:
- README showed €4,682 and old positions (SXR8/VWCE/BTC/SGLD) — actual was €4,274 with entirely different holdings (DXS3/ETH/4GLD/XEON/NATO)
- dashboard.html was 60 days stale (January 30 data)
- ASSETS.md was missing the two largest current holdings (DXS3, NATO)
- RULES.md stated max 30% high-risk while the portfolio had 64.7% in high-risk/inverse
- 200+ instances of Spanish across 6 files despite an explicit English-only rule
- Personal data (Telegram ID, GitHub username) hardcoded in scripts

**Root cause:** No periodic review process for non-daily documentation. The daily LEDGER update masked the fact that satellite docs were silently outdated.

**Lesson:** Documentation that is not part of the daily workflow drifts without anyone noticing. The more a doc is "set and forget," the faster it becomes misleading.

**Rule:** On the first session of each month, audit all non-daily docs (README, ASSETS, RULES, SIGNALS, WATCHLIST, dashboard) for accuracy. Add this as a checklist item in the monthly workflow.

---

## Patterns

| Pattern | Notes |
|---------|-------|
| BTC weekend drops | Liquidity lower, more volatile |
| BTC drags portfolio | 15% allocation caused most of the -0.84% loss |
| High cash = patience | 60% cash means we can wait for real opportunities |
| Explicit > implicit | Write down criteria or they won't be followed |

---

## Mistakes

| Date | Mistake | Cost | Lesson |
|------|---------|------|--------|
| 2026-02-02 | Deployed 40% cash in single red session | -EUR 361 (-7.27%) | Scale in over 2+ sessions |
| 2026-03-18 | Sold BTC to "protect", rebought 24h later | Fees + incoherence | 48h cooling-off before re-entry |
| 2026-03-29 | Sized positions on inflated balance (EUR 5,457 vs EUR 4,250) | DXS3 overconcentrated at 36.6% | Validate balance post-trade before new orders |

---

## Wins

| Date | Win | Gain | Why |
|------|-----|------|-----|
| 2026-01-28 | Conservative start | Safety | 60% cash preserved capital during BTC drop |
| 2026-01-30 | System overhaul | N/A | Clear framework for autonomous operation |

---

*See [STRATEGY.md](STRATEGY.md) for current approach.*
