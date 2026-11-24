---
id: TSK-025
title: Fix: append-ledger.js and update-readme.js chart derive day number from file count, off by one versus the day field
status: pending
priority: P4
tags: []
created: 2026-11-24
source: report/RPT-021
depends-on: []
---

# Fix: append-ledger.js and update-readme.js chart derive day number from file count, off by one versus the day field

## Description

Triaged from RPT-021. The run has a Day 0 file (`data/2026-01-27.json`), so the daily file count is day + 1. `append-ledger.js:103-104` writes file count as LEDGER "Days Active" (248), while README uses `latest.day` (247). The chart labels in `update-readme.js:33,38` use the array index + 1, so they are off by one too. Low impact (cosmetic public summary), but the two public files disagree. CLAUDE.md failure mode 9 says to read `day` from the daily file.

## Acceptance Criteria

- [ ] scripts/append-ledger.js writes Days Active from the day field of the latest data/YYYY-MM-DD.json, not the count of daily files
- [ ] scripts/update-readme.js labels chart points with entry.day instead of array index + 1
- [ ] After one session.sh or daily-update.sh run, LEDGER.md and README.md Days Active both equal the latest daily file day value
- [ ] node --check passes for both scripts; validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-24] Created