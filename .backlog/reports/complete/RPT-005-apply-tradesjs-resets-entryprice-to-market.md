---
id: RPT-005
title: apply-trades.js resets entry_price to market price when a BUY averages into an existing position
type: bug
severity: high
status: triaged
created: 2026-11-04
triaged: 2026-11-04
task-id: TSK-009
---

## Location

`scripts/apply-trades.js:114` (EUR branch at :120, USD branch at :117)

```js
const oldValue = existing.units * (currency === "USD" ? existing.current_price_usd : existing.current_price_eur);
...
existing.entry_price_eur = parseFloat(((oldValue + estimatedValueEur) / newUnits).toFixed(4));
```

The weighted average uses the old units at their **current market price**, not at
their cost basis (`entry_price_*`). After any top-up BUY, the new entry price equals
the current market price. This breaks CLAUDE.md invariant 4 ("`entry_price` =
execution price ... Never set it to current market price").

## Reproduction

Temp copy of the repo (`git archive HEAD scripts data/portfolio.json` plus
`data/.prices-latest.json`), one order in `data/.trade-orders.json`:

```json
{"orders":[{"action":"BUY","symbol":"EQQQ","estimatedValueEur":100,"estimatedFeeEur":0.1,"reason":"repro"}]}
```

`node scripts/apply-trades.js`:

| field | before | after | expected |
|---|---|---|---|
| units | 3.385101 | 3.538664 | 3.538664 |
| entry_price_eur | 524.6 | **651.2** | ~530.06 = (3.385101 × 524.6 + 100) / 3.538664 |
| pnl_pct | 24.13 | **0** | ~22.9 |

A €100 top-up erased €428 of unrealised gain from the cost basis.

## Impact

- `pnl_pct` drops to ~0, so the take-profit levels (+30% / +50%, `stoploss-watch.sh`)
  and the -15% stop rule in `validate-rules.js` measure from the wrong base.
- Reported P&L per position (README, dashboard, LEDGER) is wrong after the next
  top-up of EQQQ, ITX, VWCE, TTE or XEON.
- The trade record itself is correct, so the error can be recomputed from the trade log.

## Suggested fix

Use the cost basis: `oldCost = existing.units * existing.entry_price_eur`
(USD: `entry_price_usd`). Add a check in `validate-data.js` that recomputes the
weighted entry average from the trade log.
