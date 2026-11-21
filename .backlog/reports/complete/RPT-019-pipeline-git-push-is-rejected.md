---
id: RPT-019
title: Pipeline git push is rejected non-fast-forward since 2026-10-29 and only logs a warning
type: bug
severity: high
status: triaged
created: 2026-11-20
triaged: 2026-11-20
task-id: TSK-023
---

## Summary

The scheduled pipeline commits locally and then runs a bare `git push` with no fetch/rebase first. Since backlog PRs started merging into `main` on GitHub (first one `e7a17a4`, 2026-10-29 04:05 +0100), the scheduler's checkout is behind `origin/main`, so every push is rejected. The failure is swallowed as a log line: no Telegram alert, non-zero exit or retry.

## Locations

- `scripts/session.sh:248`: `git push 2>&1 || echo "Warning: git push failed"`
- `scripts/daily-update.sh:223-224`: `git push >> "$LOG_FILE" 2>&1 || echo "Warning: git push failed" | tee -a "$LOG_FILE"`
- `scripts/stoploss-watch.sh:179`: `subprocess.run(['git', '-C', REPO_DIR, 'push'])` (return code ignored)

None of the three scripts runs `git pull --rebase` / `git fetch` before pushing.

## Observed output

`/tmp/makemerich-daily.log`, 2026-11-20 21:30 close:

```
[main 71931ba] log: Day 270 — HOLD, portfolio summary (2026-11-20)
To github.com:jmlweb/makemerich.git
 ! [rejected]        main -> main (fetch first)
Updates were rejected because the remote contains work that you do not have locally.
Warning: git push failed
... Daily close complete.
```

`/tmp/makemerich-session.log` holds 22 `Warning: git push failed` lines.

On GitHub, `origin/main` holds no `data/` commit after `f916f7e log: Day 247 — HOLD, portfolio summary (2026-10-28)`. `data/portfolio.json` `last_updated` is `2026-10-28T20:30:04Z`, and the newest daily file is `data/2026-10-28.json`. The local pipeline is at Day 270, so 23 calendar days of daily files, LEDGER entries and README updates have not reached the public repo.

## Impact

- The public repo (README metrics, LEDGER, daily snapshots) has been frozen at Day 247 for over three weeks. Nobody was told, because the close Telegram does not mention the push result.
- Every PR merged into `main` widens the divergence. Each later fix (including backlog tasks) lands on a `main` the scheduler never pulls, so fixed scripts never run live.
- The longer it runs, the larger the eventual merge or rebase of pipeline data commits over the backlog commits.

## Suggested fix

1. Before each commit/push, run `git pull --rebase --autostash` (or fetch + rebase). On conflict, abort the rebase, skip the push and alert.
2. When the push fails, send a Telegram alert via `_send-telegram.js` in `daily-update.sh` (and log it as an error in `session.sh` / `stoploss-watch.sh`). In `stoploss-watch.sh`, check the subprocess return code.
3. One-off recovery (human): rebase or merge the scheduler checkout's local Day 248–270 commits onto `origin/main` and push. This runs on the scheduler host, outside this repo's code.
