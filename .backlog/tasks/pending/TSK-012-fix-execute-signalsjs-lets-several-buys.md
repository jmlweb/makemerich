---
id: TSK-012
title: Fix: execute-signals.js lets several BUYs in one run breach the 30% high-risk and 15% inverse limits
status: pending
priority: P2
tags: []
created: 2026-11-04
source: report/RPT-008
depends-on: []
---

# Fix: execute-signals.js lets several BUYs in one run breach the 30% high-risk and 15% inverse limits

## Description

Triaged from RPT-008. The per-trade high-risk and inverse/leveraged rooms in `scripts/execute-signals.js` are computed from pre-run holdings and never reduced by BUYs ordered earlier in the same run, so multiple high-risk BUY signals in one session can push the portfolio past the absolute 30% high-risk cap (repro in RPT-008 reaches ~40%). Accumulate per-class EUR ordered in the run, as `cashSpent` already does for cash and velocity.

## Acceptance Criteria

- [ ] generateOrders() subtracts high-risk EUR already ordered in the same run from highRiskRoom (scripts/execute-signals.js:327)
- [ ] generateOrders() subtracts inverse/leveraged EUR already ordered in the same run from inverseRoom (scripts/execute-signals.js:337)
- [ ] Replay of the RPT-008 repro (NATO 25%, BTC/ETH/SOL BUY) orders at most 250 EUR of high-risk BUYs and warns for the blocked ones
- [ ] node --check passes; validate-data.js and validate-rules.js run after the change; AGENTS.md Rule Enforcement Map row for the high-risk cap cites the updated script:line

## Notes

## Learnings

## Progress Log

- [2026-11-04] Created