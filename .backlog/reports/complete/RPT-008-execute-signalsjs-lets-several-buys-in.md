---
id: RPT-008
title: execute-signals.js lets several BUYs in one run breach the 30% high-risk and 15% inverse limits
type: bug
severity: high
status: triaged
created: 2026-11-04
triaged: 2026-11-04
task-id: TSK-012
---

## Summary

`generateOrders()` in `scripts/execute-signals.js` sizes each BUY against the high-risk and inverse/leveraged room computed from the portfolio *before* the run. It never adds the BUYs it has already ordered in the same run to that room. Two or more high-risk BUY signals in one session therefore each get the full remaining room, and the combined orders exceed the absolute 30% high-risk cap (RULES.md position limits, CLAUDE.md invariant 2).

## Location

- `scripts/execute-signals.js:327` — `const highRiskRoom = state.balance * LIMITS.MAX_HIGH_RISK - state.highRiskValue;` uses `state.highRiskValue` only; it is never increased after a BUY is pushed.
- `scripts/execute-signals.js:337` — same pattern for `inverseRoom` / `state.inverseValue` (15% inverse/leveraged cap).
- `scripts/execute-signals.js:361` — only `cashSpent` is accumulated per order; the deployment-velocity check at :346-348 already includes `cashSpent`, the risk-class checks do not.

BTC and SOL are in the quant universe (`scripts/generate-quant-signals.js:408`), so two simultaneous high-risk BUY signals are a reachable state.

## Reproduction

Copy `scripts/execute-signals.js` into a scratch dir (`/tmp/repro-es/scripts/`) with a synthetic `data/`:

- `data/portfolio.json`: balance 5000, CASH 2000, NATO 1250 (high-risk, 25%), VWCE 1750.
- `data/.quant-signals-latest.json`: regime `risk-on`; BTC, ETH, SOL each `BUY` score 30, `positionSizing.stopDistancePct` 5.
- empty `data/trades/`.

`node scripts/execute-signals.js --dry-run --json | jq -c '[.orders[]|{action,symbol,estimatedValueEur}]'`

Observed:

```
[{"action":"BUY","symbol":"BTC","estimatedValueEur":250},{"action":"BUY","symbol":"ETH","estimatedValueEur":250},{"action":"BUY","symbol":"SOL","estimatedValueEur":249.5}]
```

High-risk room was 0.30 × 5000 − 1250 = 250 EUR. The run orders 749.5 EUR of high-risk BUYs, taking high-risk allocation to ~40% of the portfolio. Expected: total high-risk BUYs in one run ≤ 250 EUR (and the later ones blocked with the "high-risk limit reached" warning).

## Suggested fix

Track high-risk and inverse EUR ordered in this run (like `cashSpent`) and subtract it from `highRiskRoom` / `inverseRoom`. Cover with a replay of the repro above plus one case for DXS3 + another inverse symbol.
