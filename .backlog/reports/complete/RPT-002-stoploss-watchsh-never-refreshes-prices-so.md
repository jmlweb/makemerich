---
id: RPT-002
title: stoploss-watch.sh never refreshes prices, so the 5-minute stop check only sees session snapshots
type: finding
severity: medium
status: triaged
created: 2026-10-29
triaged: 2026-10-29
task-id: TSK-006
---

## Observed

AGENTS.md:92 and :162 document `scripts/stoploss-watch.sh` as a stop-loss / take-profit watcher that runs every 5 minutes, 07:00–23:00. The script never fetches prices:

- `scripts/stoploss-watch.sh:21-23` loads nvm "for Yahoo Finance fetcher", but no line calls `fetch-prices.js`.
- `scripts/stoploss-watch.sh:33,43-50` reads only the cached `data/.prices-latest.json` and exits when it is older than `MAX_STALE_MINUTES = 120`.
- The only writers of that cache are `session.sh:118`, `daily-update.sh:42` and `pre-session.sh:21`.

So the watcher re-evaluates the price that the last session fetched, for up to 2 hours. It does nothing for the rest of the window. A price drop through a stop between sessions is not seen until the next session fetches prices.

The trade log confirms this. Every automatic stop-loss sell has a time equal to a session fetch time, never an intermediate 5-minute tick:

```
$ jq -r '.[] | select(.session=="stoploss-watch") | "\(.date) \(.time) \(.asset)"' data/trades/2026-0[89].json data/trades/2026-10.json
2026-08-31 10:00 UTC AIR
2026-09-10 13:30 UTC SIE
2026-10-01 10:00 UTC TTE
2026-10-01 16:00 UTC AIR
2026-10-20 10:00 UTC SIE
2026-10-23 13:30 UTC ASML
```

Also, at 2026-10-29 02:00 CET the SessionStart hook reported "Data age: 270min". Overnight and before the 09:00 session, every watcher run exits with "Prices stale".

The scheduler lives outside this repo (hustle BullMQ). If the scheduler job does not fetch prices before it calls the script, the documented behaviour is broken.

## Expected

One of these two:
- The watcher refreshes the prices of held assets (for example `node scripts/fetch-prices.js`, or a lighter fetch of held tickers only) before it checks stops.
- AGENTS.md and the Rule Enforcement Map say that stops execute only at session price snapshots.
