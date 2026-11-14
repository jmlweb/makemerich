---
id: TSK-017
title: Fix: NOVO BUY gets a DKK stop price stored as stop_loss_eur, so stoploss-watch.sh sells it within 5 minutes
status: pending
priority: P2
tags: []
created: 2026-11-14
source: report/RPT-013
depends-on: []
---

# Fix: NOVO BUY gets a DKK stop price stored as stop_loss_eur, so stoploss-watch.sh sells it within 5 minutes

## Description

Source: RPT-013.

NOVO history is in DKK (`scripts/fetch-history.js:41`), so the ATR stop from `scripts/generate-quant-signals.js:346` is in DKK. `scripts/execute-signals.js:370` passes it through, and `scripts/apply-trades.js:144` stores it as `stop_loss_eur` on a holding priced in EUR. `scripts/stoploss-watch.sh:106` then sells the position on its next run. `scripts/update-portfolio.js:252-268` also treats NOVO as non-EUR and reads `entry_price_usd`, so P&L reports 0%.

Fix the currency at one boundary. The simplest route derives the stored stop from `stopDistancePct` and the EUR execution price in apply-trades.js. Then make update-portfolio.js read the entry field that apply-trades.js writes.

## Acceptance Criteria

- [ ] A NOVO BUY applied by apply-trades.js stores a stop in the same currency as the field it writes (EUR stop below the EUR price), proven by a replay through session.sh dry-run or an apply-trades.js --dry-run with a DKK quant-signals fixture
- [ ] stoploss-watch.sh does not trigger on a freshly bought NOVO position whose price sits above its ATR stop
- [ ] update-portfolio.js reports a non-zero P&L for NOVO from the entry price apply-trades.js writes, and ratchets its trailing stop
- [ ] Alternatively NOVO is removed from the live universe (generate-quant-signals.js, fetch-prices.js, fetch-history.js watchlists) with an AGENTS.md note, if DKK support is not built
- [ ] validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-14] Created