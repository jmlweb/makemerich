---
id: TSK-027
title: Fix: generate-quant-signals.js classifies boundary scores with strict comparisons, diverging from RULES.md and backtest.js
status: pending
priority: P3
tags: []
created: 2026-11-26
source: report/RPT-023
depends-on: []
---

# Fix: generate-quant-signals.js classifies boundary scores with strict comparisons, diverging from RULES.md and backtest.js

## Description

The live classifier at `scripts/generate-quant-signals.js:326-330` uses `>` and `<` at every threshold. RULES.md:82-83, STRATEGY.md:132, AGENTS.md:213 and `scripts/backtest.js:187,193` use inclusive `>=` and `<=`. Rounded composite scores of exactly 20, 50, -20 and -50 are all reachable. At those scores the live signal differs from the documented rule and from the backtest. For example, a score of 20 gives HOLD live but BUY in the backtest. A score of 50 gives BUY instead of STRONG_BUY, so risk-off gating blocks it. See RPT-023.

## Acceptance Criteria

- [ ] generate-quant-signals.js classifies score >= 50 as STRONG_BUY, >= 20 as BUY, <= -50 as STRONG_SELL and <= -20 as SELL, matching RULES.md:82-83
- [ ] generate-quant-signals.js and backtest.js use one shared classification comparator so live and backtest decisions agree at every boundary
- [ ] A check feeding composite scores 20, 50, -20 and -50 through the live classifier yields BUY, STRONG_BUY, SELL and STRONG_SELL
- [ ] backtest.js is run after the change and its result is recorded
- [ ] RULES.md is not edited; AGENTS.md Rule Enforcement Map row for score >= 20 cites the live script:line

## Notes

## Learnings

## Progress Log

- [2026-11-26] Created