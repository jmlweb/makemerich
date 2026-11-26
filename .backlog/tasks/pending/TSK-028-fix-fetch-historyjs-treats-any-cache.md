---
id: TSK-028
title: Fix: fetch-history.js treats any cache whose last bar is today as fresh, so later sessions reuse the first same-day fetch
status: pending
priority: P3
tags: []
created: 2026-11-26
source: report/RPT-024
depends-on: []
---

# Fix: fetch-history.js treats any cache whose last bar is today as fresh, so later sessions reuse the first same-day fetch

## Description

`scripts/fetch-history.js:91-101` treats a cache as fresh whenever its last bar's date equals today's date. Line 199 then skips the refetch. No pipeline caller passes `--force` (`session.sh:122`, `daily-update.sh:46`, `pre-session.sh:26`), and the `lastFetched` timestamp written at line 141 is never read. As a result, every session after the first same-day fetch reuses that fetch's bars for all symbols. If the first fetch held a partial intraday bar, the 12:00, 15:30 and 18:00 sessions and the 21:30 update compute signals from it. This is distinct from TSK-026, which covers multi-day-old SP500/VIX cache in regime gating. See RPT-024.

## Acceptance Criteria

- [ ] isCacheFresh() in scripts/fetch-history.js no longer returns true solely because the last bar date equals today; freshness uses lastFetched age or a closed-session check
- [ ] A cache with a bar dated today and lastFetched several hours old is refetched by a plain session.sh / daily-update.sh run (no --force)
- [ ] fetch-history.js logs which symbols were served from cache and why, so a frozen same-day bar is visible in the session log
- [ ] Dry-run of session.sh exercised end-to-end after the change (not only simulate-history.js or backtest.js)

## Notes

## Learnings

## Progress Log

- [2026-11-26] Created