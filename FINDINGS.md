# Data Integrity Findings — 2026-05-28

Branch: `fix/data-integrity-2026-05-28`. PRODUCTION run. All 6 confirmed defects
resolved root-cause-first; `node scripts/validate-data.js` now passes all 5 checks.

---

## 1. Unlogged trades (HIGH) — FIXED

**Root cause:** the early Feb daily files were seeded with portfolio changes whose
trades were written to the LEDGER prose but never to `data/trades/2026-02.json`
(which only held the 2026-02-02 batch).

**Source of truth used:** LEDGER.md Day 6 / Day 10 entries, cross-checked against the
daily-file unit/entry-price/cash deltas. No values were invented.

**Reconstructed & back-filled into `data/trades/2026-02.json` (canonical schema):**

| Date | Trade | Units | Price | EUR | Verification |
|------|-------|------:|------:|----:|--------------|
| 2026-02-04 | SELL QQQ | 1.33 | $603.99 | 680.40 | LEDGER Day 6; `1.33×603.99×0.847 = €680.4` |
| 2026-02-04 | BUY GLD | 0.91 | $453.89 | 350.00 | entry-avg shift `447.92→449.90` ⇒ $453.89 ✓ |
| 2026-02-10 | BUY ETH | 0.118503 | $2007.29 | 200.00 | entry-avg shift `1943.5→1962.51` ⇒ $2007 ✓ |
| 2026-02-10 | BUY VWCE | 1.2007 | €124.93 | 150.00 | entry-avg shift `146.96→143.38` ⇒ €124.93 ⚠ |

Cash reconciliation:
- **02-04:** `921.89 + 680.40 − 350.00 = 1252.29` = recorded Day-6 cash ✓ (exact).
- **02-10:** `454.58 − 200.00 − 150.00 = 104.58` = recorded Day-10 cash ✓ (exact);
  matches LEDGER "Deployed €350 cash into ETH + VWCE".

**⚠ Flag for human review (02-10 VWCE):** the implied execution price €124.93 is far
below the market price that day (~€148.9). It is internally consistent with the
recorded units, cash delta, and entry-average, so the trade was logged to match the
ledgered holdings rather than fabricate a "nicer" price. The recorded VWCE cost basis
(entry €143.38) is therefore likely a seed mispricing. **Not corrected**, because doing
so would change historical balances/P&L without a documented source.

---

## 2. Stale `summary.json` (HIGH) — FIXED

**Root cause:** `summary.json` had **no live generator**. The only script that ever
wrote it was `simulate-history.js` (one-time seed). The daily pipeline
(`daily-update.sh`) never regenerated it, so it froze at `lastUpdated 2026-04-07`,
stopped at March, and reported `current_balance 4257.54`.

**Fix:** created `scripts/generate-summary.js` (deterministic, derives everything from
the daily files + trade log) and wired it into both `daily-update.sh` (step 9, before
the ledger draft) and `pre-session.sh` (step 9).

**Result after regeneration:** 5 months (Jan–May), `current_balance 4552.98`
(= portfolio.json / latest daily), `lastUpdated 2026-05-28`. Documented semantics:
`start/end_balance` = first/last daily balance of the month; `trades_count` = BUY/SELL
records (deposits excluded). Jan–Mar start/end balances reproduce the prior file
exactly; the old `trades_count` (1/2/2) was inaccurate and is now correct (2/9/3).

---

## 3. Stale `data/.daily-summary.txt` (MEDIUM) — FIXED

**Root cause:** the file was only written by `daily-routine.js`, which is **not in the
live pipeline** (`daily-update.sh` runs an inline flow instead). It orphaned at Day 73.

**Fix:** `generate-summary.js` now also writes `.daily-summary.txt` (same Telegram
block format), so the one pipeline step refreshes both artifacts. Regenerated → Day 104
/ €4552.98.

---

## 4. NATO missing `entryPriceUSD` (MEDIUM) — FIXED

**Root cause:** NATO was added to the portfolio on 2026-03-29 (LEDGER: 21.622 units @
€18.50 = €400) outside `apply-trades.js`, so its holding carried no entry price.
`update-portfolio.js` propagates `entry_price_usd` verbatim → with none present it
emitted no `entryPriceUSD` and `pnlPercent: 0` for 8 daily files (03-30…04-06).

**Fix (data):** back-filled `entryPriceUSD = 21.31` and recomputed `pnlPercent` in all 8
files. Derivation: €18.50 entry ÷ eurUsd 0.868 (03-29) = $21.31, the USD frame that
matches the files' value convention (`value = units × priceUSD × eurUsd`). Balances and
`value` were **left untouched** (no P&L history altered).

**Fix (recurrence):** `update-portfolio.js` now warns when a held position lacks an
entry price instead of silently reporting 0%.

**⚠ Note:** NATO's daily `value` (e.g. €352.89 on 03-30, −12% vs the €400 cost) looks
like a currency-labeling artifact (USD×FX applied to a price that tracked the EUR entry;
`change24h` that day was only −3.1%). Correcting it would move 8 days of balances, so it
is flagged, not changed.

---

## 5. trades/ schema drift (MEDIUM) — FIXED

**Root cause:** three different shapes accumulated — `2026-01` (`{trades:[id,timestamp,
shares]}`), `2026-02/03` (`{month,trades:[value_eur,units]}`), `2026-04` (bare array, the
shape `apply-trades.js` actually writes).

**Canonical schema:** the bare-array form produced by `apply-trades.js`, now documented
in AGENTS.md ("Trade Log Schema"). Migrated `2026-01/02/03` to it, preserving every
numeric value exactly (`value_eur`→`amount_eur`, `shares`→`units`, `timestamp`→`date`+
`time`, `note`→`reason`; `fee_eur: 0` where unrecorded; `session: "seed"`). `2026-04`
already canonical, untouched.

**Fix (recurrence):** `apply-trades.js` now tolerates a legacy `{trades:[…]}` file when
appending (unwraps instead of crashing on `existing.push`).

---

## 6. Ticker migration untracked (LOW) — FIXED

**Root cause:** instruments were renamed (VOO→SXR8, QQQ→EQQQ, GLD→SGLD→4GLD) but trades
reference the old tickers, breaking by-symbol ledger reconciliation.

**Fix:** added `data/.ticker-aliases.json` (flat `resolve` old→current map + `history`
chain with reasons) and documented it in AGENTS.md.

---

## 7. Unlogged auto stop-loss sell — ETH 2026-06-03 (HIGH) — FIXED 2026-07-13

**Symptom:** `validate-data.js` check 5 failed at the 2026-07-13 daily close:
"ETH disappeared on 2026-06-03 with no SELL logged" — commit/push gate blocked.

**Root cause:** `scripts/stoploss-watch.sh` (BullMQ, every 5 min) executed the ETH
stop-loss on 2026-06-03 10:01 UTC (commit `478b3c2`): it removed the holding from
`portfolio.json`, credited cash, committed and pushed — but never wrote a record to
`data/trades/2026-06.json` (invariant 6 violation). Its take-profit path had the
same gap. The nightly validation gate then failed every weekday close from
2026-06-03 to 2026-07-13, silently skipping the 21:30 commit; intraday/weekend
`session.sh` runs (no gate) swept the data into the next morning's commit, which is
why history stayed continuous in git. LEDGER Day 110 says "Trades today: None" —
wrong, left as-is per the append-only invariant; this entry is the correction.

**Source of truth used:** commit `478b3c2` message and diff — SELL 0.658029 ETH @
$1,874.43 (trigger $1,900.00), gross €1,062.94, fee 0.5% = €5.31, net €1,057.63.

**Cash reconciliation:** Day 109 cash €213.78 + €1,057.63 = €1,271.41 = Day 110
cash ✓ (exact). No past balance or P&L changed — daily files already reflected the
sale; only the missing trade record was back-filled into `data/trades/2026-06.json`.

**Recurrence guard:** `stoploss-watch.sh` now appends a canonical trade record
(`log_trade()`) in both the stop-loss and take-profit paths and stages
`data/trades/` in its auto-commit. Verified with a sandbox dry-run (fabricated
trigger → schema-valid record written).

---

## Validation

`node scripts/validate-data.js` → **ALL CHECKS PASS** (10 informational):
1. Temporal continuity — 105 files, day 0..104 contiguous ✓
2. Intra-day accounting — all balance within €0.05 ✓
3. Trade validity — all trade files canonical ✓
4. Portfolio ↔ latest-daily sync — match (€4552.98, 5 holdings) ✓
5. Trades ↔ holdings reconciliation — no unexplained same-ticker unit changes ✓

The informational lines are asset add/remove rebalance boundaries from the seeded
history (no per-trade records); per the task these are intentional and were **not**
back-filled with fabricated trades.

## Recurrence guards (added after fix)

- **Commit gate:** `daily-update.sh` runs `validate-data.js` before `git add`; a
  non-zero exit skips commit/push and fires a Telegram alert. Bad data can no longer
  ship silently.
- **Holdings change ⇒ trade record:** check 5 now FAILs when an asset is added without
  a BUY or removed without a SELL in the window — forcing every future holdings change
  through the trade log. The 16 known seed-restructuring gaps are whitelisted in
  `SEED_REBALANCES` (validate-data.js) so they pass; anything new fails.

## Out of scope / pre-existing (untouched)

`validate-rules.js` reports two **current portfolio** rule breaches — EQQQ 50.4%
(limit 50%) and cash 4.7% (min 5%). These are live allocation issues, not data-integrity
defects, and predate this work. Left for a normal rebalancing session.

---

# Finding — 2026-10-01 daily close failed validation (2026-10-08)

**Symptom:** `makemerich_daily_close` exited 1 at 21:30 CEST on 2026-10-01 ("Data validation FAILED — skipping commit/push"). No Day 220 portfolio-summary commit.

**Root cause:** `daily-update.sh` wrote `data/2026-10-01.json` in step 3 (`update-portfolio.js`), then step 8 (`apply-trades.js`) executed a SIE BUY into `portfolio.json` and the trade log. The daily file was never refreshed, so `validate-data.js` failed (balance mismatch; SIE in portfolio.json but not in latest daily). `session.sh` had the same ordering. Only bites when a run actually applies trades.

**Impact:** no data lost. The SIE BUY (0.505406 @ EUR 271.90) and the AIR/TTE stop-loss sells were committed by the 2026-10-02 09:00 session (`01c04bc`).

**Not corrected (needs Jose's sign-off):** `data/2026-10-01.json` has no SIE holding and cash EUR 363.79, so it does not reflect the SIE BUY. Fixing it would change a past balance, so it is flagged only.

**Recurrence guard:** `daily-update.sh` and `session.sh` now re-run `update-portfolio.js` after `apply-trades.js` when `tradesExecuted > 0`.

**Resolution (2026-10-08, Jose sign-off):** `data/2026-10-01.json` corrected from the trade log and the 2026-10-02 daily file. Cash 363.79 → 226.23 (363.79 − 137.42 BUY − 0.14 fee; equals the 2026-10-02 cash). Added SIE 0.505406 @ 271.90 (value 137.42, valued at execution price). Total 4527.37 → 4527.23, totalReturn −9.45 → −9.46. `validate-data.js` passes. The file's `change` block (0/0) was already zero before this fix and is left as is.

---

# Finding — Rule-enforcement audit: documented rules vs. live code (2026-10-18)

**Scope:** every risk rule in RULES.md, STRATEGY.md, HUSTLE.md and LEARNINGS.md was traced to the live pipeline (`session.sh`, `daily-update.sh`, `execute-signals.js`, `apply-trades.js`, `stoploss-watch.sh`). `simulate-history.js` is a one-off replay tool and does **not** count as enforcement. Full mapping: AGENTS.md → "Rule Enforcement Map".

**Status of every item below: flagged, not fixed.** Each fix changes live trading behavior, so it needs a `backtest.js` run and Jose's sign-off (CLAUDE.md failure mode 1). No code or data was changed by this audit.

Numbers are taken from `data/portfolio.json` and `data/trades/*.json` via `jq` as of the 2026-10-17 data.

## A1. Take-profit re-fires every day (HIGH, latent)

**Evidence:** `stoploss-watch.sh:140,159` deduplicates the +30% / +50% partial sell with a per-day flag (`/tmp/makemerich-tp30-{asset}-{date}`). `update-portfolio.js:225,246` recomputes `pnl_pct` from the immutable `entry_price`. A 25% partial sell does not change `entry_price`, so `pnl_pct` stays ≥ 30% and the next day's flag does not exist yet.

**Failure scenario:** EQQQ (51.5% of the portfolio, `pnl_pct` +22.36%) needs +6.24% more to reach the +30% trigger (EUR 681.98). From then on, the watcher sells 25% of the remaining EQQQ **every day** the gain holds above 30%, instead of once. RULES.md §7 says once at +30% and once more at +50%.

**Proposed fix (needs Jose):** persist "TP level already taken" on the holding in `portfolio.json` (e.g. `tp_taken: [30]`), not in `/tmp`.

## A2. EQQQ above the 50% single-position cap for 99 days (HIGH)

**Evidence:** EQQQ value / daily balance > 50% on 99 daily files, first 2026-05-28, last 2026-10-17, max 53.39% on 2026-10-08. `validate-rules.js` reports it every run. `execute-signals.js` auto-generates `LIMIT_VIOLATION` sells only for inverse/leveraged and high-risk drift (lines ~287–340). It caps single-position size at **entry** (line 234) but has no correction for drift **after** entry.

**Root cause:** RULES.md §4 calls the limits "absolute", but only entry-time checks exist. The 2026-05-28 audit deferred the breach to "a normal rebalancing session". No such session or script exists, so the flag had no owner.

**Proposed fix (needs Jose):** add a `MAX_SINGLE_POSITION` drift trim to `execute-signals.js` next to the high-risk correction, or amend RULES.md §4 to say the cap applies at entry only. Either way, the rule and the code must agree.

## A3. Trailing stop is not live (HIGH)

**Evidence:** RULES.md §6 and HUSTLE.md promise "exit any position down 10% from its high". The only high-watermark code is `simulate-history.js:433,470`. Live stops are written once at BUY (`apply-trades.js:121,139`, `stopPrice = price − 2×ATR14` from `generate-quant-signals.js`) and never raised.

**Failure scenario:** EQQQ trades at EUR 641.90 with +EUR 424.36 unrealized gain, but its stop is still EUR 508.78 — 3.02% **below** the EUR 524.60 entry. The whole gain can be given back before any exit fires. (Also reported independently by a side agent during this audit.)

**Proposed fix (needs Jose):** ratchet `stop_loss_eur` up in `update-portfolio.js` (max of current stop and `high × 0.90`), then backtest.

## A4. Deployment velocity caps and XEON auto-parking are simulator-only (MEDIUM)

**Evidence:** STRATEGY.md "Deployment Velocity Rules" (15% per day, 30% per rolling 5 days, auto-BUY XEON when cash > 20%). `computeDeploymentVelocity()` exists only in `simulate-history.js:106`. No live script references velocity or parking. TSK-003 (`.backlog/tasks/complete/`) planned B1 in `execute-signals.js`, but its acceptance criteria only tested `simulate-history.js`, so the task closed as complete without touching the live path.

**Impact so far:** the 15% daily cap would have fired twice. 2026-04-11 BUY EQQQ EUR 1,897.87 = 43.9% of the prior-day balance (EUR 4,322.76). 2026-06-04 BUY ITX EUR 1,045.42 = 23.1% of EUR 4,519.81. The EQQQ entry is the portfolio's best trade (A2/A3 context), so a backtest must show whether enforcing the cap helps before it is wired in.

## A5. Cash reserve excludes XEON, contrary to RULES.md §4 (MEDIUM)

**Evidence:** RULES.md §4 (2026-04-07): the 5% floor is "XEON + cash combined". `execute-signals.js:106` sets `cashValue` from `holdings.CASH` only and line 216 subtracts the 5% reserve from bare cash. `validate-rules.js:68` uses the same bare-cash basis.

**Effect:** BUY signals are rejected as "position too small (1 EUR)" (daily log 2026-10-16: SXR8, TTE) while EUR 456 of XEON sits as productive cash. Nothing converts XEON back to cash to fund a signal. The code is stricter than the rule; it is not a rules breach, but the documented rule is not the operative one.

## A6. 48-hour re-entry cooling-off is not enforced (MEDIUM)

**Evidence:** LEARNINGS.md 2026-03-18 rule: "After selling a position, enforce a 48-hour cooling-off period before re-entering the same asset". No live script implements it. AIR was stopped out 2026-08-31 10:00 UTC (EUR 201.30) and re-bought 2026-09-01 10:00 UTC (EUR 194.38) — 24 hours later. That second AIR position was stopped out on 2026-10-01 (−4.52%). SIE was re-bought 2026-10-01 after its 2026-09-10 stop (outside 48h; allowed).

## A7. SELL signals have no minimum size → dust positions (LOW)

**Evidence:** `execute-signals.js:172` sells a fixed 50% of the position on every `SELL` (100% only on `STRONG_SELL`). BUY orders have a EUR 50 minimum; SELL orders have none. 4GLD received SELL signals repeatedly between 2026-08-11 and 2026-09-30: 16 sells totalling EUR 460.52, of which 8 were under EUR 1 (the smallest EUR 0.01). 0.00002 units (EUR 0.00) remain in `portfolio.json` and still appear in ACTIVE MONITORS with a stop.

**Proposed fix (needs Jose):** sell 100% when the remainder after a 50% sell would be below the EUR 50 BUY minimum.

## A8. Every pipeline trade is labeled `makemerich-2130` (LOW, data quality)

**Evidence:** `apply-trades.js:164,197` hardcode `session: "makemerich-2130"`, so 09:00/12:00/15:30/18:00 trades carry the 21:30 label (e.g. 2026-08-11 10:00, 13:30, 16:00 UTC). The `time` field is correct, so the record is still traceable. Past records stay as-is (append-only history); a fix should pass `SESSION_LABEL` from `session.sh`/`daily-update.sh`.

## A9. Intraday and stop-loss commits bypass the validation gate (MEDIUM)

**Evidence:** `validate-data.js` gates commits only in `daily-update.sh:200`. `session.sh:247` and `stoploss-watch.sh:188` commit and push without running it. CLAUDE.md invariant 7 requires validation before any commit touching `data/`. This is the same gap that let the 2026-06-03 unlogged ETH sell sit in git for 40 days (§7): the close gate failed every night, but the ungated intraday commits kept pushing the data.

**Proposed fix:** run `validate-data.js` before `git commit` in both scripts; on failure, skip the commit and send a Telegram alert, as the close does. This changes no trading behavior, so it needs no backtest.

## Recurrence guard

- AGENTS.md now carries a **Rule Enforcement Map**: every rule → enforcing `script:line`, or **NOT ENFORCED**.
- `monthly-audit` skill now re-verifies that map.
- New rule (LEARNINGS.md 2026-10-18): a rule is not active until a live script enforces it; acceptance criteria must test the live pipeline, not `simulate-history.js`.
