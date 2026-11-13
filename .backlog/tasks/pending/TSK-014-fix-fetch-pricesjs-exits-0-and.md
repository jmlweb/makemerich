---
id: TSK-014
title: Fix: fetch-prices.js exits 0 and writes a fresh-stamped empty price file when every fetch fails
status: pending
priority: P3
tags: []
created: 2026-11-12
source: report/RPT-010
depends-on: []
---

# Fix: fetch-prices.js exits 0 and writes a fresh-stamped empty price file when every fetch fails

## Description

See RPT-010. `scripts/fetch-prices.js:142-189` swallows every fetch error and always writes `data/.prices-latest.json` with a fresh `fetchedAt`. A full outage produces `{"eurUsd":0.92,"prices":{}}` and exit 0. This disables the critical-failure guards at `session.sh:118` and `daily-update.sh:42`. It also makes `stoploss-watch.sh` treat the empty file as fresh and silently skip every stop. Coordinate with TSK-006, which may make stoploss-watch.sh fetch prices itself.

## Acceptance Criteria

- [ ] fetch-prices.js exits non-zero and leaves data/.prices-latest.json unchanged when no held asset price was fetched
- [ ] On a partial failure, assets that failed keep their previous price entry and are logged as stale instead of being dropped
- [ ] Using the EUR/USD fallback rate prints a warning line
- [ ] A simulated outage replay shows session.sh stopping at step [1/9] and daily-update.sh sending its fetch-error Telegram
- [ ] node --check passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-12] Created