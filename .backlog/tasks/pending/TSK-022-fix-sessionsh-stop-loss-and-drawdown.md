---
id: TSK-022
title: Fix: session.sh stop-loss and drawdown alert lines are always empty because the JSON parse always fails
status: pending
priority: P4
tags: []
created: 2026-11-18
source: report/RPT-018
depends-on: []
---

# Fix: session.sh stop-loss and drawdown alert lines are always empty because the JSON parse always fails

## Description

Source: RPT-018. `scripts/session.sh:180-183` splices the pretty-printed `data/.signals-latest.json` into a Python single-quoted literal. That always raises a SyntaxError, which `|| true` swallows, so session Telegram messages never carry stop or drawdown lines. Mirror the working parse in `scripts/daily-update.sh:231-239`.

## Acceptance Criteria

- [ ] session.sh builds ALERT_LINES with json.load(open(data/.signals-latest.json)) and no shell interpolation of the JSON
- [ ] With the current data/.signals-latest.json the alert block prints one line per STOP_LOSS alert
- [ ] A missing or invalid signals file still yields empty alerts without aborting the session
- [ ] bash -n scripts/session.sh passes and one MAKEMERICH_NOTIFY=1 session run shows the alert lines in the Telegram text

## Notes

## Learnings

## Progress Log

- [2026-11-18] Created