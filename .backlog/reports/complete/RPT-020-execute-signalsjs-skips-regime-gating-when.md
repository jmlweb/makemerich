---
id: RPT-020
title: execute-signals.js skips regime gating when regime is unknown, allowing BUYs during a VIX/SP500 data outage
type: bug
severity: medium
status: triaged
created: 2026-11-22
triaged: 2026-11-22
task-id: TSK-024
---

## Summary

Market regime gating (RULES.md §8, AGENTS.md Rule Enforcement Map row "Market regime gating ... Enforced") fails open. When the regime cannot be computed, every BUY passes through with no regime restriction.

## Where

- `scripts/generate-quant-signals.js:44-48` — `computeMarketRegime()` returns `null` when `data/history/SP500.json` or `data/history/VIX.json` is missing or too short; `scripts/generate-quant-signals.js:477` then writes `marketRegime: { regime: 'unknown' }`.
- `scripts/execute-signals.js:279-287` — the BUY gate only checks `regime === 'crisis'` and `regime === 'risk-off'`; `'unknown'` falls through to normal risk-on sizing.
- `scripts/session.sh:122` — `fetch-history.js` failure only prints `Warning: history fetch failed`, so the pipeline continues to signal generation and `apply-trades.js`. `data/history/` is gitignored, so a cleared cache plus a Yahoo `^VIX`/`^GSPC` failure is enough.

Related path: `loadHistory()` (`scripts/generate-quant-signals.js:86-94`) has no freshness check, so if the fetch fails but an old cache file exists, the regime is computed from stale data without any warning.

## Reproduction

Copy the repo to a temp dir, write a quant-signals file with one BUY (SAP, score 30) and vary only the regime, then run `node scripts/execute-signals.js --dry-run --json`:

```
regime=unknown:
{"orders":[{"action":"BUY","symbol":"SAP","estimatedValueEur":224.2}],"warnings":[]}
regime=crisis:
{"orders":[],"warnings":["Market Regime: CRISIS","SAP: CRISIS: BUY blocked for non-XEON (BUY, score: 30)"]}
regime=risk-off:
{"orders":[],"warnings":["Market Regime: RISK-OFF","SAP: RISK-OFF: need STRONG_BUY (score >= 50) (BUY, score: 30)"]}
```

With `unknown`, the order is emitted and no warning is produced at all.

## Expected

An undeterminable (or stale) regime should be treated conservatively — e.g. as `risk-off` or `crisis` — and emit a warning, so a data outage cannot bypass the risk control.
