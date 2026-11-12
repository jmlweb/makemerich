---
id: RPT-010
title: fetch-prices.js exits 0 and writes a fresh-stamped empty price file when every fetch fails
type: bug
severity: medium
status: triaged
created: 2026-11-12
triaged: 2026-11-12
task-id: TSK-014
---

## Summary

`scripts/fetch-prices.js:142-171` logs a failed asset fetch as `ERROR` and continues. `fetch-prices.js:185-189` then always writes `data/.prices-latest.json` with `fetchedAt: new Date().toISOString()`, even when `prices` is empty. `fetchEURUSD()` (`fetch-prices.js:104-113`) silently falls back to a hardcoded `0.92`. The script exits 0 in all these cases.

## Reproduction

Copy `scripts/fetch-prices.js` and `data/portfolio.json` to a temporary directory. Run it with a preload that makes every `https.get` emit a network error:

```
$ node -r ./fail.js scripts/fetch-prices.js; echo "exit=$?"
Yahoo error for ^GDAXI: getaddrinfo ENOTFOUND (simulated outage)
Prices saved to /tmp/.../data/.prices-latest.json
exit=0
$ jq -c '{fetchedAt,eurUsd,n:(.prices|length)}' data/.prices-latest.json
{"fetchedAt":"2026-11-12T23:02:37.593Z","eurUsd":0.92,"n":0}
```

## Impact

- `session.sh:118` (`|| { echo "ERROR: fetch-prices failed"; exit 1; }`) and `daily-update.sh:42` (Telegram "error fetching prices") are documented critical-failure paths. They can never fire on a fetch outage.
- `stoploss-watch.sh:46-50` skips stale prices, but this empty file is stamped fresh. `stoploss-watch.sh:82-84` then `continue`s past every held asset without a log line. For up to 120 minutes the 5-minute stop check runs, sees no stops and logs nothing.
- The previous good price file is overwritten, so later steps lose the last known prices. `apply-trades.js` skips orders with "no price data".
- After an exchange-rate API failure, USD assets are priced at 0.92 EUR/USD. The real rate in the current cache is 0.897, so the error is about 2.6%. Nothing warns about it.

## Expected

If no held asset gets a price, exit non-zero and keep the previous file. When only some fetches fail, keep the last known price for those assets with their old timestamp. Warn loudly when the EUR/USD fallback is used.
