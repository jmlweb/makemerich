---
id: RPT-014
title: _send-telegram.js hardcodes a personal Telegram chat ID in the public repo
type: security
severity: medium
status: triaged
created: 2026-11-18
triaged: 2026-11-18
task-id: TSK-018
---

## Observed

`scripts/_send-telegram.js:23` defines `const DEFAULT_CHAT_ID = '<numeric personal chat ID>';` and `scripts/_send-telegram.js:91` falls back to it when neither `--chat-id` nor `TELEGRAM_CHAT_ID` in `~/.secrets` is set:

```
const chatId = chatIdOverride || secrets.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
```

The repository is public. CLAUDE.md invariant 10 states: "No secrets or personal data in the repo. Telegram IDs, tokens, emails live in `~/.secrets` or env — never hardcoded (this happened once; it was an audit finding)." The file header itself (lines 5-6) says both values are read from `~/.secrets`.

## Reproduction

```
rg -n "DEFAULT_CHAT_ID" scripts/_send-telegram.js
# 23:const DEFAULT_CHAT_ID = '...';
# 91:  const chatId = chatIdOverride || secrets.TELEGRAM_CHAT_ID || DEFAULT_CHAT_ID;
git log --format='%h %ad %s' --date=short -S DEFAULT_CHAT_ID -- scripts/_send-telegram.js
# 6403f71 2026-10-20 log: Day 239 — HOLD, session 09:00 (2026-10-20)
```

The file entered the repo inside an automated `log: Day 239` pipeline commit (the `git add -A` path described in CLAUDE.md failure mode 19), so it was never reviewed as a code change.

## Impact

A personal Telegram identifier is published on GitHub, repeating the earlier audit finding. A missing `TELEGRAM_CHAT_ID` also silently routes alerts to the hardcoded chat instead of failing loudly.

## Suggested fix

Remove `DEFAULT_CHAT_ID`; fail with a clear error when no chat ID is configured (same as the missing-token path at line 89). Add a secrets sweep check for numeric Telegram IDs. Whether to rewrite history is Jose's call.
