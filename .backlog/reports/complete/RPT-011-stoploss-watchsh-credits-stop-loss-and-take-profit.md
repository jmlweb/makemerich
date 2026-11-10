---
id: RPT-011
title: stoploss-watch.sh credits stop-loss and take-profit proceeds from the stale amount_eur, not units x trigger price
type: bug
severity: low
status: triaged
created: 2026-11-10
triaged: 2026-11-10
task-id: TSK-015
---

## Observed

In `scripts/stoploss-watch.sh`, a triggered stop credits CASH with `value_eur = data.get('amount_eur', 0)` (`scripts/stoploss-watch.sh:108`). That is the holding value written by the last `update-portfolio.js` run. The trade record logs `units` and `current_price` from `data/.prices-latest.json`. Take-profit does the same: `sell_value = amount_eur * 0.25` (`scripts/stoploss-watch.sh:150`).

So the logged `amount_eur` does not equal `units × price`. Logged stop-loss records:

```
date        asset  units     price    amount_eur  units*price
2026-09-10  SIE    0.811001  259.95   210.78      210.82
2026-10-01  TTE    2.719327  74.40    202.35      202.32
```

Reproduce:

```bash
jq -r '.[] | select(.session=="stoploss-watch") | [.date,.asset,.units,(.price_eur//.price_usd),.amount_eur,(.units*(.price_eur//.price_usd))] | @tsv' data/trades/*.json
```

## Why it matters

Today the gap is cents, because the price cache and `amount_eur` come from the same session snapshot. TSK-006 makes the watcher refresh prices between sessions. After that, a price falling through the stop is sold at the trigger price but credited at the older, higher valuation. Cash ends up overstated by the move since the last session.

## Expected

Proceeds are `units × current_price` converted to EUR (USD stops use `eurUsd`), minus fee. The recorded `amount_eur` matches that same figure. Take-profit uses the current price too.
