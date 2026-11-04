---
id: RPT-006
title: pre-session-summary.sh drops NEAR and TRIGGERED stop-loss alerts from the session-start summary
type: bug
severity: low
status: triaged
created: 2026-11-04
triaged: 2026-11-04
task-id: TSK-010
---

## Location

`scripts/pre-session-summary.sh:98`

```python
near = [a for a in alerts if a.get('status') in ('NEAR_TRIGGER', 'WARNING')]
active = [a for a in alerts if a.get('status') == 'ACTIVE']
```

`scripts/generate-signals.js:59` writes stop-loss statuses `TRIGGERED`, `NEAR` or
`ACTIVE`. No producer writes `NEAR_TRIGGER`. Alerts with status `NEAR` or
`TRIGGERED` match neither list, so the summary never prints them.

## Observed output (2026-11-04)

`data/.signals-latest.json`:

```
{"asset":"EQQQ","type":"STOP_LOSS","status":"ACTIVE","distancePct":9.57}
{"asset":"ITX","type":"STOP_LOSS","status":"ACTIVE","distancePct":9.43}
{"asset":"VWCE","type":"STOP_LOSS","status":"NEAR","distancePct":2.87}
{"asset":"TTE","type":"STOP_LOSS","status":"ACTIVE","distancePct":8.48}
```

SessionStart summary `[Signals]` block:

```
ACTIVE MONITORS:
  EQQQ [STOP_LOSS] EUR 651.20 -> stop 588.87 (9.6% away)
  ITX [STOP_LOSS] EUR 57.08 -> stop 51.696 (9.4% away)
  TTE [STOP_LOSS] EUR 83.60 -> stop 76.5114 (8.5% away)
```

VWCE, the position closest to its stop, is missing. There is no `NEAR TRIGGER:` section.

## Impact

Interactive sessions start with a summary that hides the most at-risk position.
A triggered stop would also be hidden. The pipeline is not affected:
`session.sh:136` parses the text output of `generate-signals.js`, which groups `NEAR` correctly.

## Suggested fix

Match the producer: `('NEAR', 'WARNING')` for near, and add a `TRIGGERED` section.
