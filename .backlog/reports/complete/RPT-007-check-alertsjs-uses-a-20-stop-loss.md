---
id: RPT-007
title: check-alerts.js uses a -20% stop-loss threshold while RULES.md sets -15%
type: bug
severity: low
status: triaged
created: 2026-11-04
triaged: 2026-11-04
task-id: TSK-011
---

## Location

`scripts/check-alerts.js:23`

```js
const THRESHOLDS = {
  STOP_LOSS: -20,           // Individual position
```

and `scripts/check-alerts.js:86`: `} else if (pos.pnlPercent <= -15) {` labels a -15% position
"approaching stop-loss".

RULES.md:67 says "**Stop-loss**: Exit any position down 15% from entry".
`scripts/validate-rules.js:27` uses `STOP_LOSS_PCT: -15` and reports `STOP_LOSS_BREACH`
at -15%. The constant in `check-alerts.js` has no `// from RULES.md` comment and
does not match.

## Reproduction

The logic gives this result for a position with `pnlPercent: -17`:

- `validate-rules.js`: `[STOP_LOSS_BREACH] ... SELL IMMEDIATELY`, exit 1
- `check-alerts.js`: `[WARNING] X down -17.0% - approaching stop-loss`, action
  "Prepare exit strategy", exit 0 (not critical)

`check-alerts.js` runs in `scripts/pre-session.sh:36` and `scripts/daily-routine.js:66`.
AGENTS.md:136 documents it as "Check stop-loss/take-profit alerts".
Current output with live data: `✅ No alerts - all clear` (no position is near -15%
today, so nothing is wrong right now).

## Impact

The two scripts give opposite advice for a position between -15% and -20%.
The live stop is enforced by `stoploss-watch.sh` using per-holding `stop_loss_eur`,
so no trade is affected. Only the alert text and exit code are wrong.

## Suggested fix

Set `STOP_LOSS: -15 // from RULES.md` and derive the warning band from it
(e.g. -12%, as in `validate-rules.js`).
