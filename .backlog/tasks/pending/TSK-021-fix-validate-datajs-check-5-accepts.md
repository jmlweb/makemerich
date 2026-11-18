---
id: TSK-021
title: Fix: validate-data.js check 5 accepts any unit change as long as one trade exists in the window
status: pending
priority: P3
tags: []
created: 2026-11-18
source: report/RPT-017
depends-on: []
---

# Fix: validate-data.js check 5 accepts any unit change as long as one trade exists in the window

## Description

Source: RPT-017. Check 5 in `scripts/validate-data.js:158-171` only requires that some trade exists in the window. It does not compare trade units with the unit delta, so a wrong delta or a partial SELL that "explains" a full removal passes. A per-window strict sum would false-fail history, because mid-session snapshots shift trades into the next window. Reconcile cumulatively instead. The DXS3 2026-04-07 gap is past history: document it in FINDINGS.md, never rewrite it.

## Acceptance Criteria

- [ ] Check 5 reconciles units cumulatively per asset (running sum of BUY/SELL units vs daily-file units) within a small unit tolerance, resetting the baseline at SEED_REBALANCES boundaries
- [ ] A temp copy with 1 EQQQ unit removed from data/2026-10-23..28.json and portfolio.json makes validate-data.js exit 1
- [ ] Committed history still passes; the DXS3 2026-04-07 gap of 116.02 units is explicitly whitelisted with a FINDINGS.md entry, not silently accepted
- [ ] Header comment of validate-data.js describes the new check
- [ ] daily-update.sh and session.sh runs pass validate-data.js after the change

## Notes

## Learnings

## Progress Log

- [2026-11-18] Created