---
id: TSK-023
title: Fix: Pipeline git push is rejected non-fast-forward since 2026-10-29 and only logs a warning
status: pending
priority: P2
tags: []
created: 2026-11-20
source: report/RPT-019
depends-on: []
---

# Fix: Pipeline git push is rejected non-fast-forward since 2026-10-29 and only logs a warning

## Description

Triaged from RPT-019. All three pipeline scripts run a bare `git push` with no fetch/rebase (`scripts/session.sh:248`, `scripts/daily-update.sh:223-224`, `scripts/stoploss-watch.sh:179`) and treat failure as a log line. Backlog PRs merged into `main` since 2026-10-29 left the scheduler checkout behind `origin/main`, so every push since then was rejected `(fetch first)`. The public repo is frozen at Day 247 (2026-10-28) while the local pipeline is at Day 270.

The one-off recovery (rebase or merge the scheduler checkout's local Day 248–270 commits onto `origin/main`, then push) is a human step on the scheduler host. Do it before or together with this fix. Until it is done, merged backlog fixes never reach the live pipeline.

## Acceptance Criteria

- [ ] session.sh, daily-update.sh and stoploss-watch.sh run git pull --rebase --autostash (or fetch + rebase) before committing/pushing; on rebase conflict they abort the rebase, skip the push and alert
- [ ] daily-update.sh sends a Telegram alert via _send-telegram.js when git push fails instead of only echoing a warning
- [ ] stoploss-watch.sh checks the return code of its git push subprocess and logs a failure line
- [ ] Replay: with the local checkout one commit behind origin/main, a dry run of the commit+push block in daily-update.sh ends with the local data commit on top of origin/main and a successful push
- [ ] AGENTS.md notification table lists the push-failure Telegram alert

## Notes

## Learnings

## Progress Log

- [2026-11-20] Created