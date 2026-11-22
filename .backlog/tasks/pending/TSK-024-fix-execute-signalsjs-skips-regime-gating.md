---
id: TSK-024
title: Fix: execute-signals.js skips regime gating when regime is unknown, allowing BUYs during a VIX/SP500 data outage
status: pending
priority: P3
tags: []
created: 2026-11-22
source: report/RPT-020
depends-on: []
---

# Fix: execute-signals.js skips regime gating when regime is unknown, allowing BUYs during a VIX/SP500 data outage

## Description

Market regime gating fails open: when `computeMarketRegime()` cannot compute a regime (missing/short SP500 or VIX history), `generate-quant-signals.js:477` writes `regime: 'unknown'`, and `execute-signals.js:279-287` only blocks on `crisis`/`risk-off`, so BUYs are sized as risk-on with no warning. `session.sh:122` only warns when `fetch-history.js` fails, so a data outage silently disables the control. Stale cached history is also used without a freshness check (`generate-quant-signals.js:86`).

See RPT-020 for the dry-run reproduction.

## Acceptance Criteria

- [ ] execute-signals.js treats an unknown or missing marketRegime conservatively (no non-XEON BUY passes that crisis would block) and emits a warning naming the missing regime
- [ ] generate-quant-signals.js flags SP500/VIX history older than a defined freshness window instead of computing the regime silently from stale cache
- [ ] Dry-run reproduction from RPT-020 with regime unknown produces no SAP BUY order and a regime warning
- [ ] session.sh end-to-end replay with data/history/VIX.json removed completes as HOLD for non-defensive BUYs
- [ ] AGENTS.md Rule Enforcement Map regime row cites the new script:line
- [ ] validate-data.js passes after the change

## Notes

## Learnings

## Progress Log

- [2026-11-22] Created