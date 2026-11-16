---
id: TSK-018
title: Fix: apply-trades.js re-applies a stale .trade-orders.json when execute-signals.js fails
status: pending
priority: P2
tags: []
created: 2026-11-16
source: report/RPT-014
depends-on: []
---

# Fix: apply-trades.js re-applies a stale .trade-orders.json when execute-signals.js fails

## Description

Source: RPT-014.

`apply-trades.js` applies whatever is in `data/.trade-orders.json` and never checks `generatedAt`. When `execute-signals.js` fails before it writes the file, the previous session's orders are still on disk. Both `session.sh` (via `ACTUAL_ORDERS=1` on the fallback text) and `daily-update.sh` (unconditionally) then run `apply-trades.js`, which executes those orders again under today's date. They skip the limit, deploy-cap and cooldown checks.

Fix both places: add a freshness guard in `apply-trades.js`, and gate the step in both shell scripts on `execute-signals.js` succeeding. Acceptance must exercise the live shell scripts, not the simulator (CLAUDE.md row 16).

## Acceptance Criteria

- [ ] apply-trades.js refuses an orders file whose generatedAt is not from the current run (stale threshold or different Europe/Madrid date), logs a warning and exits 0 without writing portfolio.json or the trades log
- [ ] session.sh and daily-update.sh do not run apply-trades.js when execute-signals.js exits non-zero
- [ ] session.sh no longer treats the execute-signals failure fallback text as actionable orders (ACTUAL_ORDERS stays 0)
- [ ] Replay of the RPT-014 reproduction (corrupt .quant-signals-latest.json + old .trade-orders.json) through session.sh in a temp copy applies zero trades
- [ ] node --check / bash -n pass; validate-data.js passes after the change

## Notes

## Learnings

## Progress Log

- [2026-11-16] Created