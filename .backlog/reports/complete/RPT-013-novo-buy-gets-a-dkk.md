---
id: RPT-013
title: NOVO BUY gets a DKK stop price stored as stop_loss_eur, so stoploss-watch.sh sells it within 5 minutes
type: bug
severity: high
status: triaged
created: 2026-11-14
triaged: 2026-11-14
task-id: TSK-017
---

## Summary

NOVO (Novo Nordisk, `NOVO-B.CO`) is on the quant watchlist, but its history and prices are quoted in DKK while every live downstream step assumes EUR or USD. A BUY order for NOVO stores a DKK stop price in the `stop_loss_eur` field. That stop is about 7.46x the EUR price, so `stoploss-watch.sh` sells the new position on its next 5-minute run.

## Code path

1. `scripts/fetch-history.js:41` fetches NOVO history with `currency: 'DKK'`.
2. `scripts/generate-quant-signals.js:123` takes `price` from the DKK closes, and `scripts/generate-quant-signals.js:346` sets `positionSizing.stopPrice = price - 2*ATR`, in DKK. No conversion happens.
3. `scripts/execute-signals.js:370` copies `stopPrice` into the order unchanged.
4. `scripts/apply-trades.js:40-43` `getAssetCurrency('NOVO')` returns `"EUR"` (NOVO is not in the USD list). The price comes from `.prices-latest.json`, which `scripts/fetch-prices.js:154-155` has already converted to EUR. Then `scripts/apply-trades.js:144` writes `holding.stop_loss_eur = stopPrice` (the DKK value).
5. `scripts/stoploss-watch.sh:89-106` compares `priceEUR` with `stop_loss_eur`. EUR ~34 <= DKK stop ~280 is true, so it sells the whole position.

Secondary effect in the same mismatch: `scripts/update-portfolio.js:68` labels NOVO `currency: "DKK"`, so the non-EUR branch runs (`scripts/update-portfolio.js:252-268`). It reads `entry_price_usd` (absent, because apply-trades wrote `entry_price_eur`), so P&L reports 0%. It writes the native DKK close into `current_price_usd`, and the trailing-stop ratchet is skipped because `stop_loss_usd` is null.

## Reproduction

Run in a temporary copy of the repo, with a synthetic 120-day DKK history for NOVO (prices around 250-290 DKK):

```
$ node scripts/generate-quant-signals.js --symbol NOVO
--- NOVO (DKK 292.64) ---
  ATR stop: 280.6446 (4.1% away)
$ jq '.prices.NOVO.priceEUR' data/.prices-latest.json
34.18230563002681
```

With that order, apply-trades sets `stop_loss_eur: 280.6446` on a position priced at EUR 34.18. `stoploss-watch.sh` line 106 (`if current_price <= stop`) is then true at once. The result is a forced SELL, a 0.1% fee on each side, and a false stop-out that also starts the 48h re-entry cooldown.

## Expected

The stop price stored on the holding uses the same currency as the field it is written to. Either convert ATR stops to EUR (or derive the stop as `priceEur * (1 - stopDistancePct/100)`) in execute-signals/apply-trades, or remove NOVO from the live universe until DKK is handled from start to finish. `update-portfolio.js` should value NOVO with the same entry-price field that apply-trades writes.
