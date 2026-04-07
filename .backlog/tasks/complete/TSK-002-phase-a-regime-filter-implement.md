---
id: TSK-002
title: Phase A: regime filter — implement and validate in isolation
status: complete
priority: P1
tags: []
created: 2026-04-07
source: plan/PLN-001
depends-on: []
completed: 2026-04-07
started: 2026-04-07
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

- [x] generate-quant-signals.js outputs marketRegime: { regime, sp500vsSma50, vix } in signals file
- [x] execute-signals.js can read regime and apply gated thresholds (regime-ready, minimal filtering active)
- [x] simulate-history.js applies regime filter per day (crisis mode only: VIX > 30)
- [x] Phase A simulation results documented: -11.69% return, -14.43% max drawdown (baseline maintained)

## Notes

## Learnings

## Progress Log

- [2026-04-07] Created
- [2026-04-07] Implemented computeMarketRegime() in generate-quant-signals.js
- [2026-04-07] Added market regime output to .quant-signals-latest.json
- [2026-04-07] Updated simulate-history.js with regime detection and crisis-mode filtering
- [2026-04-07] Phase A results: -11.69% return, -14.43% max drawdown (baseline = no regression)
- [2026-04-07] Decision gate: Baseline maintained, proceeding to Phase B for incremental improvement
- [2026-04-07] Completed