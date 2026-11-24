---
id: RPT-021
title: append-ledger.js and update-readme.js chart derive day number from file count, off by one versus the day field
type: bug
severity: low
status: triaged
created: 2026-11-24
triaged: 2026-11-24
task-id: TSK-025
---

## What

Two pipeline outputs count day files instead of reading the `day` field. The run starts with a Day 0 file (`data/2026-01-27.json`, `"day": 0`), so file count = day + 1.

- `scripts/append-ledger.js:103-104` writes `| Days Active | ${dayFiles.length} |` into the LEDGER.md summary table. `append-ledger.js` runs in both `session.sh:240` and `daily-update.sh:173`.
- `scripts/update-readme.js:33` and `:38` label chart points `idx + 1` (array position), so the last chart label is 248, not 247.

`update-readme.js:113` itself uses `latest.day` for the README "Days Active" row. The two public summaries therefore disagree. CLAUDE.md failure mode 9 says to read `day` from the daily file and never derive it.

## Observed output

```
$ rg -n "\| Days Active \|" LEDGER.md README.md
README.md:14:| Days Active | 247 |
LEDGER.md:10:| Days Active | 248 |
$ jq .day data/2026-10-28.json
247
$ ls data | rg -c '^\d{4}-\d{2}-\d{2}\.json$'
248
$ jq .day data/2026-01-27.json
0
```

## Fix direction

In append-ledger.js, read `day` from the latest `data/YYYY-MM-DD.json` file. Do not use the file count. In update-readme.js, label chart points with `entry.day` instead of the index. After the next run, LEDGER.md and README.md must both show the `day` value of the latest daily file.
