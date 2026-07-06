---
name: session-recovery
description: Diagnose and recover a failed or missing cron trading session (no Telegram received, missing daily file, stale data, failed commit/push, validation failure). Use when a scheduled session (09:00/12:00/15:30/18:00/21:30) didn't complete, when data looks stale, or when Jose says "yesterday's close is missing" or "no telegram arrived".
---

# Session Recovery

Recover a broken cron session **safely** — the #1 risk here is double-applying trades or fabricating a ledger entry. Diagnose first, mutate last.

## Phase 1 — Diagnose (read-only, always do all of it)

```bash
# 1. What do the logs say?
tail -50 /tmp/makemerich-session.log
tail -50 /tmp/makemerich-daily.log
journalctl --user -u 'makemerich*' --since "today" --no-pager | tail -30

# 2. What state is the repo in?
git -C /home/hustle/projects/makemerich status --short
git -C /home/hustle/projects/makemerich log --oneline -5

# 3. Data freshness + today's artifacts
jq -r '.fetchedAt' data/.prices-latest.json
ls data/$(date +%Y-%m-%d).json 2>/dev/null || echo "MISSING daily file"
head -30 LEDGER.md   # latest entry day + date

# 4. Were trades logged today? (CRITICAL before any re-run)
jq --arg d "$(date +%Y-%m-%d)" '[.[] | select(.date==$d)]' data/trades/$(date +%Y-%m).json 2>/dev/null
```

Classify the failure before touching anything:

| Symptom in log | Class | Severity |
|---|---|---|
| `error fetching prices` / fetch-prices non-zero | **A: fetch failure** | Recoverable |
| `Claude CLI failed or timed out` | **B: agent timeout** | Benign — fallback text used, pipeline continued |
| `apply-trades failed` | **C: trade application failure** | Dangerous — verify trade log vs portfolio |
| `Data validation FAILED — skipping commit/push` | **D: integrity gate** | Commit intentionally blocked — fix data first |
| `git push failed` | **E: push failure** | Trivial |
| Nothing in log at all for the slot | **F: session never ran** | Check cron/worker upstream |

## Phase 2 — Recover, per class

**A — fetch failure.** Usually transient (Yahoo/Coinbase). Re-run pipeline read steps only:
```bash
node scripts/fetch-prices.js && node scripts/fetch-history.js && node scripts/update-portfolio.js
node scripts/generate-signals.js && node scripts/generate-quant-signals.js && node scripts/execute-signals.js
```
If it was the 21:30 close, continue to the "missed close" recipe below. If intraday, nothing else needed — the next cron slot recovers on its own.

**B — agent timeout.** No action. The LEDGER got fallback text ("Automated close — agent unavailable"). Optionally improve the analysis line by appending nothing — never rewrite the entry. This class is working-as-designed.

**C — apply-trades failure.** The danger zone. Determine which side of the write it died on:
1. Orders that should have applied: `jq . data/.trade-orders.json`
2. Trades actually logged today (Phase 1 step 4) vs holdings deltas in `portfolio.json`
3. Three states:
   - Logged AND holdings changed → it actually succeeded; failure was downstream. Move on.
   - Neither → re-run `node scripts/apply-trades.js` once, then `node scripts/update-portfolio.js`.
   - One but not the other → **stop, do not re-run** (re-running duplicates). Reconcile by hand: make trade log and holdings agree per CLAUDE.md data-repair quality bar, then `validate-data.js`.

**D — validation gate.** Run `node scripts/validate-data.js` and read which of the 5 checks failed. Fix per CLAUDE.md invariants (source-of-truth reconstruction; flag what can't be derived). Never bypass the gate by committing manually while it fails.

**E — push failure.** `git pull --rebase && git push`. If diverged, the remote wins for history — never force-push this repo.

**F — never ran.** The trigger lives outside this repo (hustle BullMQ workers / systemd). Check `systemctl --user status`, report upstream, then run the missed session manually (below).

## Missed 21:30 close — full manual replay

Only if today's LEDGER entry is missing AND market data for today is obtainable:

```bash
bash scripts/daily-update.sh
```

That is the whole recipe — the script is the source of truth for order-of-operations and already contains the validation gate, fallback analysis, commit convention (`log: Day N — ACTION, ...`), and Telegram send. Do NOT re-implement its steps by hand unless it dies mid-way; then resume from the failing step per the classes above.

If the missed day is **in the past** (e.g. noticed next morning): prices for "yesterday close" are gone. Create the daily file from the last known prices, mark the analysis line "Reconstructed — session missed", and note it in FINDINGS.md. Never invent close prices.

## Phase 3 — Verify (always)

- [ ] `node scripts/validate-data.js` → all checks pass
- [ ] `data/YYYY-MM-DD.json` exists for today, `day` number consecutive with yesterday
- [ ] LEDGER latest entry matches today's date exactly once (no duplicate day)
- [ ] `git log -1` shows the session commit; pushed
- [ ] If anything was reconstructed: FINDINGS.md updated
- [ ] Jose notified via Telegram if trades were involved or history was touched: `node scripts/_send-telegram.js "..."`
