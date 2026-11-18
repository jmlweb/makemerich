---
id: TSK-018
title: Fix: _send-telegram.js hardcodes a personal Telegram chat ID in the public repo
status: pending
priority: P3
tags: []
created: 2026-11-18
source: report/RPT-014
depends-on: []
---

# Fix: _send-telegram.js hardcodes a personal Telegram chat ID in the public repo

## Description

`scripts/_send-telegram.js:23` hardcodes a personal Telegram chat ID as `DEFAULT_CHAT_ID`, used as a fallback at line 91. The repo is public and CLAUDE.md invariant 10 forbids hardcoded Telegram IDs. The file landed via an automated `log: Day 239` commit (6403f71). See RPT-014.

Fix: drop the constant and fail loudly when no chat ID is configured.

## Acceptance Criteria

- [ ] DEFAULT_CHAT_ID is removed from scripts/_send-telegram.js and no numeric Telegram chat ID remains anywhere in the working tree (rg check)
- [ ] _send-telegram.js exits 1 with a clear error when neither --chat-id nor TELEGRAM_CHAT_ID in ~/.secrets is set, matching the missing-token path
- [ ] A --dry-run and one real send with TELEGRAM_CHAT_ID set in ~/.secrets still work
- [ ] FINDINGS.md records the exposure and leaves the history-rewrite decision to Jose

## Notes

## Learnings

## Progress Log

- [2026-11-18] Created