---
id: TSK-007
title: Fix: apply-trades.js labels every pipeline trade session makemerich-2130
status: pending
priority: P4
tags: []
created: 2026-10-29
source: report/RPT-003
depends-on: []
---

# Fix: apply-trades.js labels every pipeline trade session makemerich-2130

## Description

See RPT-003 and FINDINGS.md A8. Replace the hardcoded `session: "makemerich-2130"` at `scripts/apply-trades.js:169` and `:203` with a label from the caller.

## Acceptance Criteria

- [ ] apply-trades.js writes the session label passed by its caller in BUY and SELL records, falling back to makemerich-2130 when none is given
- [ ] session.sh passes SESSION_LABEL and daily-update.sh passes its 21:30 label
- [ ] Past trade records in data/trades/ are unchanged
- [ ] Dry-run of apply-trades.js with a sample order shows the passed label; FINDINGS.md A8 is marked fixed
- [ ] node --check and bash -n pass; validate-data.js passes

## Notes

## Learnings

## Progress Log

- [2026-10-29] Created