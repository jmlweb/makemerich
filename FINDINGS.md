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
