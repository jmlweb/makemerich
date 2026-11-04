---
id: TSK-009
title: Fix: apply-trades.js resets entry_price to market price when a BUY averages into an existing position
status: pending
priority: P2
tags: [apply-trades, data-integrity]
created: 2026-11-04
source: report/RPT-005
depends-on: []
---

# Fix: apply-trades.js resets entry_price to market price when a BUY averages into an existing position

## Description

Source: RPT-005. In `scripts/apply-trades.js:114` the BUY-into-existing branch values the old
units at `current_price_*`. The new `entry_price_*` (USD :118, EUR :122) therefore equals the
market price, which breaks invariant 4 and resets `pnl_pct`, take-profit and stop-rule baselines.

Reproduced on a temp copy: a 100 EUR EQQQ top-up moved entry_price_eur from 524.6 to 651.2 and
pnl_pct from 24.13 to 0.

Check `data/trades/*.json` for past top-ups (same asset BUY while already held) to see whether
any live entry price is already wrong. Flag, don't rewrite (CLAUDE.md failure mode 5).

## Acceptance Criteria

- [ ] scripts/apply-trades.js averages entry_price_eur/entry_price_usd from cost basis (existing.units * entry_price) plus the new buy, not from current market value (lines 114, 118, 122)
- [ ] Replay of a 100 EUR EQQQ top-up on a temp copy (3.385101 units @ 524.6, buy @ 651.2) yields entry_price_eur ~530.06, not 651.2
- [ ] validate-data.js recomputes the weighted entry average from data/trades/*.json and flags holdings whose entry_price diverges
- [ ] Any past top-up whose entry_price was reset is listed in FINDINGS.md for Jose; no historical P&L is changed without sign-off
- [ ] node --check passes and validate-data.js passes after the change

## Notes

## Learnings

## Progress Log

- [2026-11-04] Created