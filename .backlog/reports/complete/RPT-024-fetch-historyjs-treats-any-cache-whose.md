---
id: RPT-024
title: fetch-history.js treats any cache whose last bar is today as fresh, so later sessions reuse the first same-day fetch
type: bug
severity: medium
status: triaged
created: 2026-11-26
triaged: 2026-11-26
task-id: TSK-028
---

## Summary

`isCacheFresh()` only checks whether the last cached bar's date equals today's date. After the first successful fetch of a day writes a bar dated today, every later `fetch-history.js` run that day skips the refetch for that symbol. This applies to every symbol: holdings, watchlist, SP500 and VIX.

## Evidence

- `scripts/fetch-history.js:91-101`: `return lastDate === today;`. There is no time-of-fetch check.
- `scripts/fetch-history.js:141` writes `lastFetched`, but no script reads it (`rg -n lastFetched scripts/` has one hit: the write).
- `scripts/fetch-history.js:199`: `if (!force && isCacheFresh(cachePath)) { skipped++; continue; }`.
- No pipeline caller passes `--force`:
  - `scripts/session.sh:122`
  - `scripts/daily-update.sh:46`
  - `scripts/pre-session.sh:26`
- `scripts/generate-quant-signals.js:118-122` takes `price` and every indicator from the cached `closes` array.

## Reproduction

The repro extracts `isCacheFresh` from `fetch-history.js:91-102` into /tmp. It then runs it against a cache whose last bar is dated today, with `lastFetched` at 08:05Z:

```
now 2026-11-26T23:03:26.496Z | lastFetched 2026-11-26T08:05:00.000Z | isCacheFresh -> true
```

A cache fetched 15 hours earlier is reported fresh.

## Impact

Suppose the first fetch of a trading day returns a bar dated today. This could be a partial intraday bar from the 09:00 or 12:00 session. Then the 12:00, 15:30 and 18:00 sessions and the 21:30 `daily-update.sh` compute indicators from that frozen bar. `execute-signals.js` would size orders from signals that do not reflect the day's later prices. The run logs only `N cached`.

This report is distinct from TSK-026. TSK-026 covers multi-day-old SP500/VIX cache feeding regime gating (`generate-quant-signals.js:86`). This report covers the same-day freshness rule in `fetch-history.js`.

## Fix direction

Base freshness on `lastFetched` age, or on whether the last bar is from a closed session. Alternatively, have the session scripts refetch today's bar.
