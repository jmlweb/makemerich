---
id: TSK-011
title: Fix: check-alerts.js uses a -20% stop-loss threshold while RULES.md sets -15%
status: pending
priority: P4
tags: [check-alerts, rules]
created: 2026-11-04
source: report/RPT-007
depends-on: []
---

# Fix: check-alerts.js uses a -20% stop-loss threshold while RULES.md sets -15%

## Description

Source: RPT-007. `scripts/check-alerts.js:23` sets `STOP_LOSS: -20` and `:86` calls -15% "approaching".
RULES.md:67 and `scripts/validate-rules.js:27` use -15%. The two scripts give opposite advice
between -15% and -20%. Advisory only: live stops are enforced by `stoploss-watch.sh`.

## Acceptance Criteria

- [ ] scripts/check-alerts.js STOP_LOSS threshold is -15 with a // from RULES.md comment
- [ ] The approaching-stop warning band is derived from the threshold (e.g. -12%), matching validate-rules.js
- [ ] A position at pnlPercent -17 yields a CRITICAL alert and exit code 1
- [ ] node --check passes

## Notes

## Learnings

## Progress Log

- [2026-11-04] Created