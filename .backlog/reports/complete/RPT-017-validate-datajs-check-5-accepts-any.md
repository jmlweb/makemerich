---
id: RPT-017
title: validate-data.js check 5 accepts any unit change as long as one trade exists in the window
type: bug
severity: medium
status: triaged
created: 2026-11-18
triaged: 2026-11-18
task-id: TSK-021
---

## Summary

`scripts/validate-data.js` check 5 ("Trades <-> holdings reconciliation") only tests that *some* trade exists for the asset in the date window. It never compares the size of the unit change with the units in the trade log. The header (`scripts/validate-data.js:11-13`) says a unit change "must have a matching trade", and CLAUDE.md invariant 6 relies on this check to make every holdings change traceable. A wrong unit delta passes.

## Code

- `scripts/validate-data.js:158-159`: same-ticker change. `ts.length === 0` is the only failure condition.
- `scripts/validate-data.js:169-171`: added/removed asset. Any BUY or SELL in the window is enough. A partial SELL "explains" the full removal of the position.

## Reproduction (temp copy, nothing committed)

```
T=$(mktemp -d) && cp -r scripts data $T/ && cd $T
for f in data/2026-10-2[3-8].json; do jq '(.positions[]|select(.asset=="EQQQ")|.units) -= 1' $f > x && mv x $f; done
jq '.holdings.EQQQ.units -= 1' data/portfolio.json > x && mv x data/portfolio.json
node scripts/validate-data.js | tail -3
```

EQQQ goes 3.617747 -> 2.385101 between 2026-10-22 and 2026-10-23. The only logged trade is a SELL of 0.232646 units on 2026-10-23, so 1 unit is unaccounted for. Output:

```
  ✅ no unexplained unit changes or rebalance boundaries
✅ ALL CHECKS PASS (16 informational)
```

## Evidence in committed history

DXS3 on 2026-04-07: `data/2026-04-06.json` holds 277.5958 units. `data/2026-04-07.json` holds none. The trade log has one SELL of 161.58 units (`data/trades/2026-04.json`). LEDGER.md:8649 states "Remaining: 116.02 units". `2026-04-07:DXS3` is not in `SEED_REBALANCES`. Check 5 passes only because a SELL exists. The 116.02-unit removal has no trade record and no FINDINGS.md entry. This is past history: flag it, do not rewrite it.

## Fix constraints

A per-window strict sum would false-fail committed history. Daily snapshots are taken mid-session, so trades land in the next window. Example: 4GLD 2026-08-11..2026-09-02 mismatches per window but reconciles cumulatively. Reconcile cumulatively per asset (running units from trades vs daily units) with a small tolerance. Reset the baseline at `SEED_REBALANCES` boundaries. Whitelist the known DXS3 2026-04-07 gap explicitly, with a FINDINGS.md reference.
