---
id: TSK-013
title: Fix: update-portfolio.js zeroes the daily change on every same-day rerun, so every daily file records 0%
status: pending
priority: P3
tags: []
created: 2026-11-10
source: report/RPT-009
depends-on: []
---

# Fix: update-portfolio.js zeroes the daily change on every same-day rerun, so every daily file records 0%

## Description

See RPT-009. `scripts/update-portfolio.js:281-282` zero `change` whenever today's file already exists. The script runs up to five times a day (pre-session, session pre- and post-trade, daily-update pre- and post-trade), so the final write is always 0. Fix the rerun branch to compare against the previous day's file. Fix forward only; historical files need a separate, signed-off decision.

## Acceptance Criteria

- [ ] update-portfolio.js computes change against the latest daily file dated before --date, also when today's file already exists
- [ ] Running update-portfolio.js twice on the same day leaves change.percentage equal to balance vs the previous day's file (verified on a live session.sh or daily-update.sh run)
- [ ] check-alerts.js big-move alert and generate-summary.js Today line read a non-zero change on a day the balance moved
- [ ] Past daily files are not rewritten without Jose's sign-off; any backfill is documented in FINDINGS.md
- [ ] node --check passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-10] Created