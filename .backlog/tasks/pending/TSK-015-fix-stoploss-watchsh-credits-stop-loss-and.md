---
id: TSK-015
title: Fix: stoploss-watch.sh credits stop-loss and take-profit proceeds from the stale amount_eur, not units x trigger price
status: pending
priority: P4
tags: []
created: 2026-11-10
source: report/RPT-011
depends-on: []
---

# Fix: stoploss-watch.sh credits stop-loss and take-profit proceeds from the stale amount_eur, not units x trigger price

## Description

See RPT-011. `scripts/stoploss-watch.sh:108` and `:150` credit cash from the holding's `amount_eur` (last `update-portfolio.js` valuation) while the trade record logs the trigger price. Gaps are cents today (SIE 2026-09-10: 210.78 vs 210.82). They grow once TSK-006 makes the watcher refresh prices between sessions. Land this before or with TSK-006.

## Acceptance Criteria

- [ ] Stop-loss proceeds in stoploss-watch.sh are units x current_price in EUR (USD stops converted with eurUsd) minus fee
- [ ] Take-profit proceeds use the current price from the price cache, not amount_eur x 0.25
- [ ] Each new stoploss-watch trade record satisfies amount_eur = units x price (EUR) within EUR 0.01
- [ ] Replay of stoploss-watch.sh against a fixture portfolio and price file credits CASH with the trigger-price proceeds
- [ ] bash -n passes and validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-11-10] Created