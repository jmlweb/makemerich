---
id: TSK-013
title: Fix: update-portfolio.js zeroes the daily change on every re-run of the same day
status: pending
priority: P3
tags: []
created: 2026-11-12
source: report/RPT-009
depends-on: []
---

# Fix: update-portfolio.js zeroes the daily change on every re-run of the same day

## Description

See RPT-009. `scripts/update-portfolio.js:281-287` forces `change` to 0 when the daily file already exists. Every scheduled re-run of the same day overwrites the real change, so the daily Telegram summary always says `Today: +0.00%` and the `check-alerts.js:106` big-move alert can never fire. Fix the update path to look up the previous day's file. Do not back-fill past daily files without Jose's sign-off (CLAUDE.md invariant 5, failure mode 5).

## Acceptance Criteria

- [ ] update-portfolio.js computes change against the latest daily file dated before --date, on both first run and update runs
- [ ] Running update-portfolio.js twice on the same date leaves the same non-zero change in data/<date>.json
- [ ] A daily-update.sh replay (or live 21:30 run) commits a daily file whose change matches balance minus the previous day balance
- [ ] Past daily files are not rewritten; the historical zero changes are recorded in FINDINGS.md for Jose
- [ ] node --check passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-12] Created