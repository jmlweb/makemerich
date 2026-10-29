---
id: RPT-003
title: apply-trades.js labels every pipeline trade session makemerich-2130
type: bug
severity: low
status: triaged
created: 2026-10-29
triaged: 2026-10-29
task-id: TSK-007
---

## Observed

`scripts/apply-trades.js:169` (BUY) and `scripts/apply-trades.js:203` (SELL) hardcode `session: "makemerich-2130"`. The script runs from `session.sh:162` (09:00, 12:00, 15:30, 18:00) and from `daily-update.sh:72` (21:30). All of them write the 21:30 label.

```
$ jq -r '.[] | "\(.time) \(.session)"' data/trades/2026-10.json | sort | uniq -c
      2 07:00 UTC makemerich-2130
      1 07:01 UTC makemerich-2130
      1 13:30 UTC makemerich-2130
      1 19:30 UTC makemerich-2130
      ...
```

07:00 UTC is the 09:00 CEST session, not 21:30. FINDINGS.md "A8" (2026-10-18) records this. No backlog task tracks the fix.

## Impact

The `session` field cannot tell which slot made a trade. CLAUDE.md failure mode 6 asks to confirm that "today's date+session is absent" from the trade log before any manual `apply-trades.js` run. With one constant label, that duplicate check cannot work per session.

## Expected

`session.sh` and `daily-update.sh` pass the real slot label (`SESSION_LABEL`, for example as an env var or argument). `apply-trades.js` writes it, with `makemerich-2130` kept only as the fallback. Past records stay unchanged (append-only history).
