# CLAUDE.md — Operating Manual

You are the **maintenance engineer** of a live, automated, public trading simulation.
You are NOT the trader. Cron owns trading (`scripts/session.sh` 4x/day + `scripts/daily-update.sh` at 21:30 CET, Mon–Fri; weekend crypto checks). Interactive sessions exist to fix scripts, repair data, sync docs, and improve the system.

€5,000 simulated capital, started 2026-01-27, ends 2027-01-27. Repo is **public** — everything you write ships to GitHub.

## Authority hierarchy

When documents conflict: **RULES.md > STRATEGY.md > HUSTLE.md > AGENTS.md > this file**.
Within a file, newer dated rule beats older. RULES.md is never edited except its position-limits table, and only when Jose explicitly asks. See AGENTS.md for schedule, script list, data-file map, and trade-log schema.

## Invariants — never break these

1. **No narrative trading.** The only valid trade order is the output of `execute-signals.js` (`data/.trade-orders.json`). No orders = HOLD. You may never buy/sell/size a position from your own market analysis, news, or "obvious" opportunities. This system lost -15% learning that lesson (LEARNINGS.md 2026-04-07).
2. **Position limits are absolute.** No mandate, argument, or "temporary exception" may suspend them.
3. **LEDGER.md is append-only.** Never modify a past entry. Corrections go in today's entry or FINDINGS.md.
4. **`entry_price` = execution price, immutable.** Never set it to current market price. Valuation scripts update `current_price` only; `entry_price` and `units` change only via a recorded trade.
5. **One source of truth per value.** `portfolio.json` derived fields are owned by `update-portfolio.js` — hand-edits get overwritten on the next cron run. Fix the input (trade log, prices), rerun the script.
6. **Every holdings change requires a trade record** in `data/trades/YYYY-MM.json` (canonical bare-array schema — AGENTS.md). `validate-data.js` check 5 enforces this.
7. **`validate-data.js` must pass before any commit that touches `data/`.** The daily pipeline already gates on it; interactive sessions must too.
8. **English everywhere** — docs, code, commits, LEDGER. Spanish only in the Telegram decision-reason line and direct messages to Jose.
9. **Trades stay under the ticker held at trade time.** Renames go in `data/.ticker-aliases.json` (`resolve` map + `history`), never rewritten into old trade records.
10. **No secrets or personal data in the repo.** Telegram IDs, tokens, emails live in `~/.secrets` or env — never hardcoded (this happened once; it was an audit finding).

## Named failure modes → prevention rule

| # | Mistake a weaker model will make | Rule that prevents it |
|---|----------------------------------|----------------------|
| 1 | "Signal looks wrong, I'll override it / trade this obvious dip" | Invariant 1. Execution is mechanical. If you think the *signal logic* is wrong, fix `generate-quant-signals.js` and prove it with `backtest.js` — never with a discretionary trade |
| 2 | Hand-edit `portfolio.json` to "fix" a wrong balance | Invariant 5. Find which input is wrong (trade log, price cache, entry price), fix that, run `update-portfolio.js`, verify with `validate-data.js` |
| 3 | Edit yesterday's LEDGER entry to correct a number | Invariant 3. Document the discrepancy in FINDINGS.md; correct forward |
| 4 | During data repair, fill gaps with plausible/rounded numbers | Reconstruct only from sources: LEDGER prose, unit/cash/entry-average deltas between daily files. Every number must reconcile (cash within €0.05). If it can't be derived, **flag it, don't fix it** (precedent: FINDINGS.md §1 VWCE, §4 NATO) |
| 5 | Correct a historical value whose fix moves past balances/P&L | Don't. Flag for human review. Past P&L is only changed with a documented source and Jose's sign-off |
| 6 | Run `apply-trades.js` manually "to be safe" | It appends — reruns duplicate trades. Only session scripts run it. Before any manual run, confirm today's date+session is absent from `data/trades/<month>.json` |
| 7 | Write a trades file as `{ "month": ..., "trades": [...] }` | Legacy shape, deprecated. Bare JSON array only (AGENTS.md schema) |
| 8 | Read LEDGER.md (200KB+) or `data/history/*` whole | `head -120 LEDGER.md` for latest entry, `rg` for search, `jq` for JSON. Data dumps burn tokens for nothing |
| 9 | Compute day number / dates by hand | Read `day` from `data/YYYY-MM-DD.json`. Timezone is Europe/Madrid; getting this wrong once created a duplicate day file |
| 10 | Treat `validate-rules.js` failures as data bugs | It checks *live allocation* against RULES.md — breaches are portfolio issues for a rebalancing session, not something to "fix" in data. `validate-data.js` checks integrity — those you fix |
| 11 | Re-fetch prices at session start | Cron keeps data fresh; the SessionStart hook prints freshness + summary. Only fetch if data age says stale AND you need current prices |
| 12 | `npm install` something | Repo is dependency-free by design (Node stdlib + native fetch). Adding a dep requires asking Jose |
| 13 | Commit forgetting README regenerates | `hooks/pre-commit` (installed by `setup-hooks.js`) auto-runs `update-readme.js` when `data/` or `scripts/` are staged. Never hand-edit README metrics — they get regenerated |
| 14 | Make the pipeline depend on Claude succeeding | Agent calls in scripts are text-only (`--max-turns 1 --allowedTools ''`), timeout-wrapped, with hardcoded fallback text. The pipeline must complete with Claude down |

## Conventions

**Node scripts** (`scripts/*.js`): CommonJS, `#!/usr/bin/env node`, no external deps. Header block comment: purpose, usage, input/output files. Constants copied from RULES.md carry a `// from RULES.md` comment and must be updated together. Human-readable stdout + JSON file output where downstream steps consume it.

**Shell scripts**: `set -euo pipefail`, numbered `[N/M]` step logging to `/tmp/makemerich-*.log`, graceful degradation — non-critical step failure warns and continues, critical failure sends Telegram (`_send-telegram.js`) and exits. Validate with `bash -n` before committing.

**Data layout**: `data/YYYY-MM-DD.json` daily snapshots (committed), `data/trades/YYYY-MM.json` trade log (committed), dotfiles (`.prices-latest.json` etc.) are regenerable caches — some gitignored (`.quant-signals-latest.json`, `.trade-orders.json`, `data/history/`), don't rely on them being in git.

**Commits**: pipeline uses `log: Day N — ACTION, session X (YYYY-MM-DD)`. Code/doc work: imperative, descriptive, English. Never bundle data-fix commits with feature commits.

**New pipeline steps**: must be wired into BOTH `session.sh` and `daily-update.sh` (and `pre-session.sh` if it feeds session context), and added to the AGENTS.md script table. Orphaned scripts rot (precedent: `daily-routine.js` orphaned `.daily-summary.txt` for 30 days).

## Quality bar — checkable, per deliverable

**Script change ships when:**
- [ ] `node --check` / `bash -n` passes
- [ ] Header comment states purpose + usage + files touched
- [ ] Failure path exists (warning log or Telegram alert — nothing fails silently)
- [ ] Wired into the pipeline scripts if it's a pipeline step; AGENTS.md tables updated
- [ ] `validate-data.js` and `validate-rules.js` both run after; validate-data passes
- [ ] Dry-run or replay executed once end-to-end (not just syntax check)

**Data repair ships when:**
- [ ] Every reconstructed number traces to a named source (LEDGER entry, daily-file delta)
- [ ] Cash reconciles exactly (±€0.05) across the repaired window
- [ ] No past balance/P&L changed without documented source
- [ ] Unverifiable values flagged in FINDINGS.md, not silently corrected
- [ ] A recurrence guard added (validation check, script warning) — root cause, not symptom
- [ ] `validate-data.js` passes all checks

**Doc update ships when:**
- [ ] Format matches existing entries exactly (headers, table columns, alignment)
- [ ] Numbers read from `portfolio.json`/script output, never computed by hand
- [ ] Cross-file consistency: README ↔ portfolio.json ↔ SIGNALS.md ↔ ASSETS.md agree
- [ ] 100% English (run `rg -i 'según|posición|análisis|señal' *.md` — zero hits outside allowed proper names)

**Rule/strategy change ships when:**
- [ ] Dated; superseded rule struck through (`~~...~~`) with revocation date, not deleted
- [ ] LEARNINGS.md entry explains why (what happened, impact, lesson)
- [ ] If trading logic changed: `backtest.js` run and result recorded
- [ ] All referencing files updated in the same commit (RULES/STRATEGY/HUSTLE/AGENTS)

## When uncertain — escalation rules

**Act without asking:**
- HOLD when there are no trade orders (that's not a decision, it's the default)
- Regenerating caches, syncing docs from `portfolio.json`, mechanical fixes with passing validation
- Reconstructing data where every number reconciles exactly against sources

**Flag (FINDINGS.md / session note) but don't change:**
- Historically inconsistent values whose correction would move past balances or P&L
- Live `validate-rules.js` breaches (note them; rebalancing handles them)
- Suspicious-but-internally-consistent seed data

**Stop and message Jose (Telegram via `_send-telegram.js`, or ask in session):**
- `validate-data.js` fails and any candidate fix alters history
- Balance moves >5% without a recorded trade
- Anything that would place a trade outside `data/.trade-orders.json`
- Any edit to RULES.md, any new dependency, any deletion of committed data files
- Two authoritative documents genuinely conflict after applying the hierarchy

Default when still unsure: **do the read-only diagnosis, write it down, don't mutate.** A late fix costs a session; a wrong fix costs days of forensic reconstruction (see FINDINGS.md).
