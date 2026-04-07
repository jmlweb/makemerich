---
id: TSK-002
title: Phase A: regime filter — implement and validate in isolation
status: pending
priority: P1
tags: []
created: 2026-04-07
source: plan/PLN-001
depends-on: []
---

# Phase A: regime filter — implement and validate in isolation

## Description

## Context
Phase A of PLN-001. Add market regime detection (risk-on / risk-off / crisis) based on SP500 vs SMA50 and VIX levels. Gate BUY signals by regime. Validate improvement via simulation before proceeding.

## Scope
- A1: `computeMarketRegime()` in `generate-quant-signals.js` using SP500/VIX data
- A2: Regime-gated thresholds in `execute-signals.js` (risk-on: score≥20, risk-off: defensive only score≥50, crisis: blocked except XEON)
- A3: Wire regime into `simulate-history.js`
- A4: Run simulation, compare vs -11.69% baseline

## Decision Gate
If Phase A alone achieves <10% drawdown and >-5% return, Phase B becomes optional. If worse than baseline, revisit VIX/SMA50 thresholds before continuing.


## Acceptance Criteria

- [ ] generate-quant-signals.js outputs marketRegime: { regime, sp500vsSma50, vix } in signals file
- [ ] execute-signals.js blocks non-defensive BUYs in risk-off, all BUYs in crisis
- [ ] simulate-history.js applies regime filter per day
- [ ] Phase A simulation shows measurable improvement vs -11.69% baseline (record exact numbers)

## Notes

## Learnings

## Progress Log

- [2026-04-07] Created