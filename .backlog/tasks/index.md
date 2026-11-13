# makemerich - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 12 |
| Active | 0 |
| Blocked | 0 |
| Complete | 4 |

## Active Tasks

_No active tasks._

## Pending Tasks

| ID | Title | Priority | Tags | Created |
|----|-------|----------|------|---------|
| TSK-005 | Fix: session.sh and stoploss-watch.sh commit data/ without running validate-data.js | P3 |  | 2026-10-29 |
| TSK-006 | Fix: stoploss-watch.sh never refreshes prices, so the 5-minute stop check only sees session snapshots | P3 |  | 2026-10-29 |
| TSK-007 | Fix: apply-trades.js labels every pipeline trade session makemerich-2130 | P4 |  | 2026-10-29 |
| TSK-008 | Fix: Live BUY/SELL path charges crypto 0.1% fee while RULES.md and stoploss-watch.sh charge 0.5% | P3 |  | 2026-11-01 |
| TSK-009 | Fix: apply-trades.js resets entry_price to market price when a BUY averages into an existing position | P2 | apply-trades, data-integrity | 2026-11-04 |
| TSK-010 | Fix: pre-session-summary.sh drops NEAR and TRIGGERED stop-loss alerts from the session-start summary | P4 | pre-session, signals | 2026-11-04 |
| TSK-011 | Fix: check-alerts.js uses a -20% stop-loss threshold while RULES.md sets -15% | P4 | check-alerts, rules | 2026-11-04 |
| TSK-012 | Fix: execute-signals.js lets several BUYs in one run breach the 30% high-risk and 15% inverse limits | P2 |  | 2026-11-04 |
| TSK-013 | Fix: update-portfolio.js zeroes the daily change on every re-run of the same day | P3 |  | 2026-11-12 |
| TSK-014 | Fix: fetch-prices.js exits 0 and writes a fresh-stamped empty price file when every fetch fails | P3 |  | 2026-11-12 |
| TSK-015 | Fix: generate-summary.js reports CASH as the best or worst position in the daily summary | P4 |  | 2026-11-10 |
| TSK-016 | Fix: stoploss-watch.sh credits stop-loss and take-profit proceeds from the stale amount_eur, not units x trigger price | P4 |  | 2026-11-10 |

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
| TSK-001 | Prereq: port simulate-history.js to main and verify BTC data | 2026-04-07 |
| TSK-002 | Phase A: regime filter — implement and validate in isolation | 2026-04-07 |
| TSK-003 | Phase B: deployment velocity control + XEON auto-parking | 2026-04-07 |
| TSK-004 | Phase C: update RULES.md and STRATEGY.md with new regime rules | 2026-04-07 |
