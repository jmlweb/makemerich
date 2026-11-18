---
id: RPT-015
title: session.sh and daily-update.sh glob only data/2026-*.json, so January 2027 day change compares against 2026-12-31
type: bug
severity: low
status: triaged
created: 2026-11-18
triaged: 2026-11-18
task-id: TSK-019
---

## Observed

The simulation runs until 2027-01-27, but the Telegram message builders find the previous day's balance with a year-locked glob:

- `scripts/session.sh:84` — `files = sorted(glob.glob('data/2026-*.json'))`
- `scripts/daily-update.sh:131` — `files = sorted(glob.glob('data/2026-*.json'))`

Both then take the last file earlier than `data/$TODAY.json` as the previous close. From 2027-01-02 on, no 2027 file matches the glob, so the "EUR X hoy (Y%)" line in every daily close and session report shows the cumulative change since the last 2026 file instead of the day's change.

`scripts/session.sh:71` has the same lock in the day-number fallback: `ls data/2026-*.json | wc -l` stops counting 2027 files.

## Reproduction

Same Python snippet as `session.sh:82-89`, run in a scratch dir:

```
mkdir data
echo '{"balance":{"total":4500}}' > data/2026-12-31.json
echo '{"balance":{"total":4600}}' > data/2027-01-04.json
echo '{"balance":{"total":4700}}' > data/2027-01-05.json
TODAY=2027-01-05 python3 -c "...same code..."
# prints: data/2026-12-31.json 4500   (expected data/2027-01-04.json 4600)
```

## Impact

About 18 trading days of wrong daily-change figures in the final month of the public experiment. Display only; no data file is affected.

## Suggested fix

Use `glob.glob('data/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json')` (and the matching `ls` pattern), mirroring the regex in `validate-data.js:48`.
