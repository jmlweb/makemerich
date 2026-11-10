---
id: RPT-009
title: update-portfolio.js zeroes the daily change on every same-day rerun, so every daily file records 0%
type: bug
severity: medium
status: triaged
created: 2026-11-10
triaged: 2026-11-10
task-id: TSK-013
---

## Observed

All 248 committed daily files (`data/2026-*.json`) carry `"change": {"absolute": 0, "percentage": 0}`, although the balance moves day to day (2026-10-27 4555.29 → 2026-10-28 4558.83).

`data/.daily-summary.txt` (Day 247) prints `🟢 Today: +0.00%` for that +0.08% day.

Reproduce:

```bash
for f in data/2026-1*.json; do jq -c '[.date,.balance.total,.change]' $f; done
```

## Cause

`scripts/update-portfolio.js:160` sets `isUpdate = fs.existsSync(entryPath)`. `scripts/update-portfolio.js:282` then writes `{ absolute: 0, percentage: 0 }` whenever today's file already exists. Line 281 compares against `STARTING_CAPITAL` instead of the previous day's file in that branch.

`update-portfolio.js` runs several times a day: `scripts/pre-session.sh:31`, `scripts/session.sh:126` and `:169`, `scripts/daily-update.sh:50` and `:77`. Only the first run of the day computes a change. Every later run overwrites it with 0, so the final write of the day is always 0.

## Impact

- `scripts/check-alerts.js:106`: the ">5% big move" alert can never fire.
- `scripts/generate-summary.js:91`: the Telegram daily summary always reports `Today: +0.00%`.
- `scripts/generate-dashboard.js:32`: the `dailyChanges` series is all zeros.

## Expected

On a rerun, `change` is computed against the most recent daily file dated before `date`, not zeroed.
