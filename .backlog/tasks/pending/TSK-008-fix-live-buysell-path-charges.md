---
id: TSK-008
title: Fix: Live BUY/SELL path charges crypto 0.1% fee while RULES.md and stoploss-watch.sh charge 0.5%
status: pending
priority: P3
tags: []
created: 2026-11-01
source: report/RPT-004
depends-on: []
---

# Fix: Live BUY/SELL path charges crypto 0.1% fee while RULES.md and stoploss-watch.sh charge 0.5%

## Description

Align the crypto fee in the live BUY/SELL path with RULES.md §5 (0.5%). See RPT-004. execute-signals.js and apply-trades.js charge 0.1%; stoploss-watch.sh, simulate-history.js and backtest.js charge 0.5%. Past trade records stay unchanged.

## Acceptance Criteria

- [ ] execute-signals.js FEES.Crypto and apply-trades.js getFeeRate() return 0.005 for BTC/ETH/SOL, with a // from RULES.md comment
- [ ] Dry-run of execute-signals.js plus apply-trades.js --dry-run with a sample BTC BUY and SELL order shows fee_eur = 0.5% of the trade value
- [ ] Non-crypto fees stay at 0.1% and past records in data/trades/ are unchanged
- [ ] node --check passes on both scripts; validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-01] Created
- [2026-11-01] Triage note: execute-signals.js:55 says 'Fee structure (Bitpanda: 0.1% all asset classes)', so the 0.1% crypto rate looks deliberate. Both 0.001 values first appear in git in 65a6456 (pipeline commit log: Day 233, 2026-10-14), which added these files whole; no reviewed commit changed the rate.
- [2026-11-01] Fix direction is code to RULES.md: CLAUDE.md allows RULES.md edits only in the position-limits table, so §5 (crypto 0.5%) stays authoritative unless Jose changes it. Correct the Bitpanda comment at execute-signals.js:55 in the same change.