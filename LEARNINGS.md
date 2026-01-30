# 📚 Learnings

Mistakes, successes, and patterns. Updated when something notable happens.

---

## 2026-01-30: System Design Matters

**Category:** Operations  
**Impact:** Process improvement

**What happened:** Initial HAL.md was just a schedule with no decision criteria. Cron payloads were too vague ("check markets"). No clear framework for when to buy/sell.

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

## 2026-01-28: Initial Allocation

**Category:** Strategy  
**Impact:** Neutral (baseline)

**What happened:** Started with conservative 60% cash, 25% VOO, 15% BTC.

**Lesson:** High cash reserve (60%) limits upside but provides safety and flexibility to buy dips.

**Action:** Monitor for opportunities to deploy cash if market drops 5%+.

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
| - | - | - | None yet |

---

## Wins

| Date | Win | Gain | Why |
|------|-----|------|-----|
| 2026-01-30 | System overhaul | N/A | Clear framework for autonomous operation |
| 2026-01-28 | Conservative start | Safety | 60% cash preserved capital during BTC drop |

---

*See [STRATEGY.md](STRATEGY.md) for current approach.*
