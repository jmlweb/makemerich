---
id: RPT-009
title: update-portfolio.js zeroes the daily change on every re-run of the same day, so every daily file since 2026-06 reports 0%
type: bug
severity: medium
status: triaged
created: 2026-11-12
triaged: 2026-11-12
task-id: TSK-013
---

## Summary

`scripts/update-portfolio.js:282-287` sets `change` to `{ absolute: 0, percentage: 0 }` whenever `data/<date>.json` already exists (`isUpdate`). The scheduler runs `update-portfolio.js` several times per day (`session.sh:126` four sessions, `session.sh:169` post-trade refresh, `daily-update.sh:50` and `:77`, `pre-session.sh:31`). Only the first run of the day computes the change against the previous day; every later run overwrites it with 0. The 21:30 daily close always runs on an existing file, so the committed snapshot always says 0%.

## Evidence

```
$ for f in data/2026-10-2*.json; do jq -c '[.date,.change,.balance.total]' $f; done
["2026-10-26",{"absolute":0,"percentage":0},4524.11]
["2026-10-27",{"absolute":0,"percentage":0},4555.29]
["2026-10-28",{"absolute":0,"percentage":0},4558.83]
```

The balance moved +31.18 EUR from 10-26 to 10-27, but `change` is 0. Across all 248 daily files, only 19 have a non-zero `change.percentage`. The last one is 2026-05-31.

Line 281 also sets `prevBalance = STARTING_CAPITAL` when `isUpdate` is true, so the previous-day balance is never looked up on an update.

## Impact

- `check-alerts.js:106` ("Big move" when `|change.percentage| > 5`) can never fire. CLAUDE.md lists "balance moves >5%" as an escalation condition.
- `generate-summary.js:91` writes `Today: +0.00%` into `data/.daily-summary.txt` (the daily Telegram block) every day.
- `generate-dashboard.js:32` and `:95` chart and show a flat 0% daily change.

## Expected

On an update, compute `change` against the latest daily file dated strictly before `date`, as on the first run of the day. The past daily files are history. Correcting them changes committed data, so it needs a separate decision.
