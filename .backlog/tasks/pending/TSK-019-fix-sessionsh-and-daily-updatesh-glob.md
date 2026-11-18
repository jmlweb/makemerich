---
id: TSK-019
title: Fix: session.sh and daily-update.sh glob only data/2026-*.json, so January 2027 day change compares against 2026-12-31
status: pending
priority: P4
tags: []
created: 2026-11-18
source: report/RPT-015
depends-on: []
---

# Fix: session.sh and daily-update.sh glob only data/2026-*.json, so January 2027 day change compares against 2026-12-31

## Description

`scripts/session.sh:84`, `scripts/daily-update.sh:131` and `scripts/session.sh:71` hardcode `data/2026-*.json`. The simulation ends 2027-01-27, so from 2027-01-02 the Telegram "hoy" change compares against the last 2026 file. See RPT-015 for the reproduction.

## Acceptance Criteria

- [ ] session.sh:84 and daily-update.sh:131 select previous daily files with a year-agnostic pattern (YYYY-MM-DD.json)
- [ ] session.sh:71 day-number fallback counts daily files of every year
- [ ] A scratch replay with 2026-12-31, 2027-01-04 and 2027-01-05 files picks 2027-01-04 as the previous close for TODAY=2027-01-05
- [ ] bash -n passes on both scripts

## Notes

## Learnings

## Progress Log

- [2026-11-18] Created