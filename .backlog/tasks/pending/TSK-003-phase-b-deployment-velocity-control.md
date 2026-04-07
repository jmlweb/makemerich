---
id: TSK-003
title: Phase B: deployment velocity control + XEON auto-parking
status: pending
priority: P2
tags: []
created: 2026-04-07
source: plan/PLN-001
depends-on: []
---

# Phase B: deployment velocity control + XEON auto-parking

## Description

## Context
Phase B of PLN-001. Incremental improvement on top of Phase A regime filter. Adds deployment speed control and XEON productive cash parking.

## Scope
- B1: `computeDeploymentVelocity()` in `execute-signals.js` — 15% session cap, 30% 5-day velocity brake
- B2: XEON auto-parking — BUY when idle cash >20%, SELL to fund other buys when cash insufficient
- B3: Wire velocity + XEON into `simulate-history.js` (handle cross-month trade parsing, intra-day order sequencing)
- B4: Simulate A+B combined, compare vs Phase A-only results

## Notes
- Trade history is monthly in `data/trades/YYYY-MM.json` — velocity function must handle cross-month ranges
- XEON sell→buy is two-step logic — simulation must handle intra-day order sequencing
- This phase is optional if Phase A alone hits targets


## Acceptance Criteria

- [ ] execute-signals.js caps daily deployment at 15% of portfolio
- [ ] execute-signals.js pauses BUYs when 5-day velocity > 30%
- [ ] execute-signals.js auto-generates BUY XEON when idle cash > 20%
- [ ] Phase A+B simulation shows max drawdown < 10% and return > -5%

## Notes

## Learnings

## Progress Log

- [2026-04-07] Created