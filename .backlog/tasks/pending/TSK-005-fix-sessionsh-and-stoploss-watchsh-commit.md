---
id: TSK-005
title: Fix: session.sh and stoploss-watch.sh commit data/ without running validate-data.js
status: pending
priority: P3
tags: []
created: 2026-10-29
source: report/RPT-001
depends-on: []
---

# Fix: session.sh and stoploss-watch.sh commit data/ without running validate-data.js

## Description

Close the validation gap recorded in RPT-001 and FINDINGS.md A9. Copy the gate pattern from `scripts/daily-update.sh:204-214` into `scripts/session.sh` (before line 246) and into the Python commit block of `scripts/stoploss-watch.sh` (before line 187). This changes no trading behaviour, so no backtest is needed.

## Acceptance Criteria

- [ ] session.sh runs node scripts/validate-data.js before git commit; on failure it skips commit/push and sends a Telegram alert via _send-telegram.js
- [ ] stoploss-watch.sh runs node scripts/validate-data.js before its git commit; on failure it skips commit/push and sends a Telegram alert
- [ ] Sandbox replay with a deliberately broken data/portfolio.json shows both scripts skip the commit
- [ ] AGENTS.md Rule Enforcement Map row for invariant 7 cites the new live script:line for all three scripts, and FINDINGS.md A9 is marked fixed
- [ ] bash -n passes on both scripts and validate-data.js passes on the live data

## Notes

## Learnings

## Progress Log

- [2026-10-29] Created
- [2026-10-29] Triage correction: the stoploss-watch.sh commit block is at lines 177-179 (subprocess.run git add/commit/push), not 187-189 as RPT-001 states; insert the gate before line 177.
- [2026-10-29] Triage correction: session.sh exits at the pre-check skip (lines 150-155) without committing when there are no violations, triggers or orders; the ungated commit at lines 244-248 runs only on the actionable path, so a sandbox repro must force it (FORCE_AGENT or a near trigger), not a plain check run.