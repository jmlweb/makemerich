---
id: TSK-014
title: Fix: generate-summary.js reports CASH as the best or worst position in the daily summary
status: pending
priority: P4
tags: []
created: 2026-11-10
source: report/RPT-010
depends-on: []
---

# Fix: generate-summary.js reports CASH as the best or worst position in the daily summary

## Description

See RPT-010. `scripts/generate-summary.js:89-90` reduce over all positions, including the CASH entry that `update-portfolio.js` adds with `pnlPercent: 0`. On 2026-10-28 the summary said `Worst: CASH (0.0%)` while VWCE (+1.2%) was the weakest holding. Filter CASH out before the reduce.

## Acceptance Criteria

- [ ] generate-summary.js picks Best and Worst only from positions whose asset is not CASH
- [ ] With no invested holdings, the Best/Worst lines are omitted instead of showing CASH
- [ ] Live daily-update.sh run writes data/.daily-summary.txt without CASH in Best or Worst
- [ ] node --check passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-10] Created