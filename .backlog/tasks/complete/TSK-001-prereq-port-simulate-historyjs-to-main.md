---
id: TSK-001
title: Prereq: port simulate-history.js to main and verify BTC data
status: complete
priority: P1
tags: []
created: 2026-04-07
source: plan/PLN-001
depends-on: []
completed: 2026-04-07
started: 2026-04-07
---

# Prereq: port simulate-history.js to main and verify BTC data

## Description

## Context
Prerequisites for PLN-001. simulate-history.js only exists on the `adjusted` branch — it's the validation engine for all subsequent phases. BTC is missing from latest signals output and must be verified before simulating.

## Scope
- Port `scripts/simulate-history.js` from `adjusted` to `main`
- Check `data/history/BTC.json` data completeness
- Ensure BTC appears in signal generation output


## Acceptance Criteria

- [x] Cherry-pick or merge simulate-history.js (873 LOC) from adjusted branch into main
- [x] Verify data/history/BTC.json completeness and coverage
- [x] Ensure generate-quant-signals.js includes BTC in analysis
- [x] Confirm simulate-history.js runs successfully on main

## Notes

## Learnings

## Progress Log

- [2026-04-07] Created
- [2026-04-07] Ported simulate-history.js from adjusted branch (873 LOC)
- [2026-04-07] Added BTC to watchlist in generate-quant-signals.js
- [2026-04-07] Baseline simulation: -11.69% return, -14.43% max drawdown, 8 trades
- [2026-04-07] Completed