---
id: RPT-001
title: session.sh and stoploss-watch.sh commit data/ without running validate-data.js
type: bug
severity: medium
status: triaged
created: 2026-10-29
triaged: 2026-10-29
task-id: TSK-005
---

## Observed

CLAUDE.md invariant 7 says `validate-data.js` must pass before any commit that touches `data/`. Only the close enforces it:

```
$ rg -n 'validate-data' scripts/session.sh scripts/stoploss-watch.sh scripts/daily-update.sh
scripts/stoploss-watch.sh:60:    holdings change needs a trade record — validate-data.js check 5)."""   # comment only
scripts/daily-update.sh:208:node scripts/validate-data.js >> "$LOG_FILE" 2>&1
```

- `scripts/session.sh:246-248` runs `git add -A`, `git commit`, `git push` with no validation step (4 runs/day).
- `scripts/stoploss-watch.sh:187-189` commits and pushes `data/portfolio.json` and `data/trades/` after an automatic sell, with no validation step.

FINDINGS.md "A9" (2026-10-18) documents this gap and AGENTS.md:227 marks the invariant as "Close only". No backlog task tracks the fix. This gap let the unlogged ETH sell of 2026-06-03 stay in the public repo for 40 days (FINDINGS.md §7).

## Reproduction

1. Make `data/portfolio.json` inconsistent with the trade log (for example, change a holding's `units`).
2. Run `bash scripts/session.sh check` in a sandbox clone.
3. The session commits and pushes the broken data. Only the 21:30 run of `daily-update.sh` fails.

## Expected

Both scripts run `node scripts/validate-data.js` before `git commit`. On failure they skip the commit and send a Telegram alert through `_send-telegram.js`, as `daily-update.sh` does.
