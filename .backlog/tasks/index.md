# makemerich - Task Index

## Stats

| Status | Count |
|--------|-------|
| Pending | 21 |
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
| TSK-017 | Fix: NOVO BUY gets a DKK stop price stored as stop_loss_eur, so stoploss-watch.sh sells it within 5 minutes | P2 |  | 2026-11-14 |
| TSK-018 | Fix: _send-telegram.js hardcodes a personal Telegram chat ID in the public repo | P3 |  | 2026-11-18 |
| TSK-019 | Fix: session.sh and daily-update.sh glob only data/2026-*.json, so January 2027 day change compares against 2026-12-31 | P4 |  | 2026-11-18 |
| TSK-020 | Fix: apply-trades.js re-applies a stale .trade-orders.json when execute-signals.js fails | P2 |  | 2026-11-16 |
| TSK-021 | Fix: validate-data.js check 5 accepts any unit change as long as one trade exists in the window | P3 |  | 2026-11-18 |
| TSK-022 | Fix: session.sh stop-loss and drawdown alert lines are always empty because the JSON parse always fails | P4 |  | 2026-11-18 |
| TSK-023 | Fix: Pipeline git push is rejected non-fast-forward since 2026-10-29 and only logs a warning | P2 |  | 2026-11-20 |
| TSK-024 | Fix: update-readme.js computes README position allocation against starting capital, not current balance | P3 |  | 2026-11-24 |
| TSK-025 | Fix: append-ledger.js and update-readme.js chart derive day number from file count, off by one versus the day field | P4 |  | 2026-11-24 |

## Recently Completed

| ID | Title | Completed |
|----|-------|-----------|
| TSK-001 | Prereq: port simulate-history.js to main and verify BTC data | 2026-04-07 |
| TSK-002 | Phase A: regime filter — implement and validate in isolation | 2026-04-07 |
| TSK-003 | Phase B: deployment velocity control + XEON auto-parking | 2026-04-07 |
| TSK-004 | Phase C: update RULES.md and STRATEGY.md with new regime rules | 2026-04-07 |
