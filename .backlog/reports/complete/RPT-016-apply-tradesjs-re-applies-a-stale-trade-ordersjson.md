---
id: RPT-016
title: apply-trades.js re-applies a stale .trade-orders.json when execute-signals.js fails
type: bug
severity: high
status: triaged
created: 2026-11-16
triaged: 2026-11-16
task-id: TSK-020
---

## Summary

`scripts/apply-trades.js` applies whatever `data/.trade-orders.json` holds. It never checks the file's `generatedAt`, and nothing deletes the file after it is applied. When `scripts/execute-signals.js` exits non-zero before it writes the file (`scripts/execute-signals.js:545`), the orders from an earlier session are still on disk. Both pipeline scripts then run `apply-trades.js` anyway, so those old orders execute a second time. They get today's date and are appended to the trades log as new trades.

## Where

- `scripts/apply-trades.js:47-58`: loads `ORDERS_FILE` with no freshness check on `orders.generatedAt`.
- `scripts/apply-trades.js:65`: stamps every applied order with today's date.
- `scripts/execute-signals.js:517-528`: exits 1 when `.quant-signals-latest.json` is missing, and the outer try/catch at `:555-560` exits 1 on any throw. In both cases `.trade-orders.json` is not rewritten.
- `scripts/daily-update.sh:68-72`: on an `execute-signals.js` failure it only logs "No trade orders", then runs `apply-trades.js` unconditionally.
- `scripts/session.sh:144-162`: on failure `TRADE_ORDERS` becomes the literal `No trade orders`. That text does not contain `NO ORDERS`, so `ACTUAL_ORDERS=1` (`:148`). The pre-check skip is bypassed and `apply-trades.js` runs at `:162`.

## Reproduction (temp copy of scripts/ + data/, dry run)

```
D=$(mktemp -d) && cp -r scripts data $D/ && cd $D
echo '{"generatedAt":"2026-10-28T08:00:00.000Z","orders":[{"action":"BUY","symbol":"VWCE","estimatedValueEur":100,"estimatedFeeEur":0.1,"stopPrice":160,"reason":"yesterday'"'"'s order"}]}' > data/.trade-orders.json
echo '{bad json' > data/.quant-signals-latest.json
node scripts/execute-signals.js; echo "exit=$?"
node scripts/apply-trades.js --dry-run
```

Observed output:

```
Error: Expected property name or '}' in JSON at position 1 (line 1 column 2)
exit=1
  BUY VWCE: 0.5816 units @ EUR 171.94 = EUR 100.00 (fee EUR 0.10)
[DRY RUN] Would write:
    "date": "2026-11-16",
    "action": "BUY",
```

An order generated on 2026-10-28 is applied as a 2026-11-16 trade.

## Impact

- Duplicate trades. Every order from the last successful run is executed again, which breaks CLAUDE.md invariant 1: the only valid order is the *current* `execute-signals.js` output.
- These orders skip the checks `execute-signals.js` does at generation time: position limits, the daily and 5-day deploy caps, and the 48h re-entry cooldown. They were sized against an older portfolio state.
- A stale SELL can sell a position a second time.

## Suggested direction

- Make `apply-trades.js` refuse orders whose `generatedAt` is older than the current run, e.g. older than N minutes or from a different Europe/Madrid date. Exit 0 with a warning when it refuses.
- Have both shell scripts skip `apply-trades.js` when `execute-signals.js` exits non-zero. Optionally, delete or rename the orders file once it has been applied.
