---
id: RPT-004
title: Live BUY/SELL path charges crypto 0.1% fee while RULES.md and stoploss-watch.sh charge 0.5%
type: bug
severity: medium
status: triaged
created: 2026-11-01
triaged: 2026-11-01
task-id: TSK-008
---

## Summary

RULES.md §5 (`RULES.md:62`) sets the simulated crypto fee at **0.5%**. The live signal path charges crypto **0.1%**:

- `scripts/execute-signals.js:60` — `FEES.Crypto: 0.001`. This sizes BUY orders and writes `estimatedFeeEur`, which `apply-trades.js` debits as the BUY fee.
- `scripts/apply-trades.js:35-38` — `getFeeRate()` returns `0.001` for `BTC`/`ETH`/`SOL` (the crypto branch is identical to the default). This is the SELL fee.

The other live writer uses the rule value:

- `scripts/stoploss-watch.sh:110` and `:151` — `fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL')` for stop-loss and take-profit sells.

`simulate-history.js:41`, `backtest.js:26` and `calculate-balance.js:23` also use 0.5% for crypto.

## Reproduction

```
$ rg -n "Crypto: 0|BTC.*0\.00|fee_rate = " scripts/execute-signals.js scripts/apply-trades.js scripts/stoploss-watch.sh
scripts/execute-signals.js:60:  Crypto: 0.001,
scripts/apply-trades.js:36:  if (["BTC", "ETH", "SOL"].includes(symbol)) return 0.001;
scripts/stoploss-watch.sh:110:        fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL') else 0.001
scripts/stoploss-watch.sh:151:        fee_rate = 0.005 if asset in ('BTC', 'ETH', 'SOL') else 0.001
$ rg -n "Crypto" RULES.md
62:  - Crypto: 0.5% fee
```

BTC and SOL are in the live signal universe (`generate-quant-signals.js:408`, `fetch-prices.js:137`), so a crypto BUY signal goes through this path.

## Impact

A crypto BUY or signal SELL is under-charged by 0.4% of the trade value against RULES.md. The same position pays 0.5% if `stoploss-watch.sh` exits it, so the fee depends on which script closes the trade. The simulator and backtest model 0.5%, so live results are not comparable with them. No live crypto trade has gone through `apply-trades.js` yet (`jq` over `data/trades/*.json`: crypto records are seed/reconstructed plus one `stoploss-watch` ETH sell at 0.5%). Past records need no correction.

## Suggested fix

Set the crypto rate to 0.005 in `execute-signals.js` and `apply-trades.js` with a `// from RULES.md` comment. The live fee constants are spread over three files, so consider one shared constant.
