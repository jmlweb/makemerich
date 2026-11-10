---
id: RPT-010
title: generate-summary.js reports CASH as the best or worst position in the daily summary
type: bug
severity: low
status: triaged
created: 2026-11-10
triaged: 2026-11-10
task-id: TSK-014
---

## Observed

`data/.daily-summary.txt` (Day 247, 2026-10-28):

```
🏆 Best: EQQQ (+24.1%)
📉 Worst: CASH (0.0%)
```

Every holding was positive that day (VWCE +1.2%, TTE +3.3%, XEON +7.2%, ITX +6.8%, EQQQ +24.1%), so the worst holding was VWCE, not cash.

## Cause

`scripts/generate-summary.js:89-90` reduce over all of `latest.positions` to pick best and worst by `pnlPercent`. `scripts/update-portfolio.js` pushes a `{ asset: 'CASH', pnlPercent: 0 }` entry into `positions`. Whenever every holding is above 0%, CASH wins "Worst". When every holding is below 0%, CASH wins "Best".

## Expected

Best and worst are chosen from invested holdings only (exclude `asset === 'CASH'`). The line is omitted when no invested holding exists.
