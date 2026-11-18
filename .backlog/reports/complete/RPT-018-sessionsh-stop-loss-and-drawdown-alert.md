---
id: RPT-018
title: session.sh stop-loss and drawdown alert lines are always empty because the JSON parse always fails
type: bug
severity: low
status: triaged
created: 2026-11-18
triaged: 2026-11-18
task-id: TSK-022
---

## Summary

`scripts/session.sh:180-190` reads `data/.signals-latest.json` into `SIGNALS_JSON` and splices it into a Python single-quoted string literal (`json.loads('$SIGNALS_JSON')`, line 183). `generate-signals.js:124` always writes that file pretty-printed (`JSON.stringify(result, null, 2)`). The literal therefore spans several lines, and Python raises a SyntaxError. `2>/dev/null || true` swallows it, so `ALERT_LINES` and `ALERTS` are always empty. The session Telegram message (`build_telegram_msg`, line 259) never carries the stop-loss or drawdown lines. The behavior is documented in the same script and works in `daily-update.sh`.

## Reproduction

```
SIGNALS_JSON=$(cat data/.signals-latest.json)
/usr/bin/python3 -c "
import json
s = json.loads('$SIGNALS_JSON') if '$SIGNALS_JSON' != '{}' else {}
print(len(s.get('alerts', [])))
"
```

Observed:

```
    s = json.loads('{
                   ^
SyntaxError: unterminated string literal (detected at line 3)
```

At the same time, `jq '.alerts|length' data/.signals-latest.json` returns 4 (STOP_LOSS on EQQQ, ITX, VWCE, TTE).

## Impact

Scheduled session reports are muted (`send_tg_routine`). The loss is limited to on-demand runs with `MAKEMERICH_NOTIFY=1`: those messages drop every stop and drawdown line. Any single quote in the JSON would also break the literal.

## Fix

Parse the file directly, as `scripts/daily-update.sh:231-239` already does: `json.load(open('data/.signals-latest.json'))`. Drop the shell interpolation. This is separate from TSK-010, which covers `pre-session-summary.sh`.
