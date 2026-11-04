---
id: TSK-010
title: Fix: pre-session-summary.sh drops NEAR and TRIGGERED stop-loss alerts from the session-start summary
status: pending
priority: P4
tags: [pre-session, signals]
created: 2026-11-04
source: report/RPT-006
depends-on: []
---

# Fix: pre-session-summary.sh drops NEAR and TRIGGERED stop-loss alerts from the session-start summary

## Description

Source: RPT-006. `scripts/generate-signals.js:59` writes stop statuses TRIGGERED/NEAR/ACTIVE.
`scripts/pre-session-summary.sh:98` filters on `NEAR_TRIGGER`/`WARNING`, so NEAR and TRIGGERED
alerts are dropped. On 2026-11-04 VWCE (2.87% from stop) was missing from the SessionStart summary.
Pipeline unaffected (`session.sh:136` parses generate-signals.js text output).

## Acceptance Criteria

- [ ] scripts/pre-session-summary.sh:98 matches the statuses generate-signals.js writes (NEAR, WARNING), not NEAR_TRIGGER
- [ ] TRIGGERED alerts get their own section in the [Signals] block
- [ ] Running pre-session-summary.sh against the 2026-11-04 .signals-latest.json lists VWCE under NEAR TRIGGER
- [ ] bash -n passes

## Notes

## Learnings

## Progress Log

- [2026-11-04] Created