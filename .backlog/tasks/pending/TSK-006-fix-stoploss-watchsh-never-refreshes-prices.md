---
id: TSK-006
title: Fix: stoploss-watch.sh never refreshes prices, so the 5-minute stop check only sees session snapshots
status: pending
priority: P3
tags: []
created: 2026-10-29
source: report/RPT-002
depends-on: []
---

# Fix: stoploss-watch.sh never refreshes prices, so the 5-minute stop check only sees session snapshots

## Description

See RPT-002. The watcher reads only the cached `data/.prices-latest.json` and skips runs when it is older than 120 minutes. Every logged auto stop-loss sell happened at a session fetch time. First verify the scheduler side (outside this repo), then either add a price refresh or correct the documentation. Adding a refresh changes when stops execute; get Jose's sign-off before shipping that path.

## Acceptance Criteria

- [ ] Confirm whether the hustle BullMQ stoploss job fetches prices before it calls stoploss-watch.sh, and record the answer in the task
- [ ] If it does not: stoploss-watch.sh refreshes prices of held assets before checking stops, with a warning log and no sale when the fetch fails
- [ ] If the 5-minute refresh is rejected instead: AGENTS.md schedule table and Rule Enforcement Map state that stops execute only at session price snapshots
- [ ] Live run of stoploss-watch.sh between sessions logs fresh prices (not Prices stale) or the docs match the observed behaviour
- [ ] bash -n passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-10-29] Created