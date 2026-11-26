---
id: RPT-023
title: generate-quant-signals.js classifies boundary scores with strict comparisons, so score 20 is HOLD live but BUY in backtest.js and RULES.md
type: bug
severity: medium
status: triaged
created: 2026-11-26
triaged: 2026-11-26
task-id: TSK-027
---

## Summary

The live signal classifier uses strict comparisons at every threshold, while RULES.md, STRATEGY.md, AGENTS.md and `backtest.js` all use inclusive ones. A composite score of exactly 20, 50, -20 or -50 gets a different signal live than the documented rule and the backtest give.

## Evidence

- `scripts/generate-quant-signals.js:326-330`:
  - `compositeScore > THRESHOLDS.STRONG_BUY` (50)
  - `> THRESHOLDS.BUY` (20)
  - `< THRESHOLDS.STRONG_SELL` (-50)
  - `< THRESHOLDS.SELL` (-20)
- `scripts/backtest.js:187` enters on `score >= THRESHOLDS.BUY`. `scripts/backtest.js:193` exits on `score <= THRESHOLDS.SELL`.
- These documents say "≥":
  - RULES.md:82: "BUY @ score ≥ 20".
  - RULES.md:83: "only STRONG_BUY (score ≥ 50)".
  - STRATEGY.md:132: "Normal (score ≥ 20)".
  - AGENTS.md:213: "BUY only on quant signal (score ≥ 20)".
- `scripts/execute-signals.js:273-274,285` also say "score >= 50" / ">= 20".
- `compositeScore` is `Math.round`ed (`generate-quant-signals.js:323`), so exact boundary integers occur.

## Reproduction

The sub-score values were enumerated from `generate-quant-signals.js:167-312`, using the weights at :34-40. Every boundary is reachable:

```
{"20":{"trend":80,"momentum":60,"meanRev":-30,"macd":-60,"vol":0},
 "50":{"trend":80,"momentum":80,"meanRev":70,"macd":-60,"vol":30},
 "-20":{"trend":60,"momentum":-80,"meanRev":-30,"macd":-60,"vol":0},
 "-50":{"trend":-60,"momentum":-80,"meanRev":-30,"macd":-60,"vol":0}}
```

The live classifier and the backtest decide these scores differently:

```
live score 20 -> HOLD | backtest BUY: true
live score 50 -> BUY  | backtest BUY: true
```

## Impact

- At score 20, a documented BUY is dropped live.
- At score -20, a documented SELL is held live.
- At score 50, the signal is labelled BUY instead of STRONG_BUY. `execute-signals.js:285` then blocks it in risk-off, although RULES.md:83 allows it.
- Backtest results (CLAUDE.md requires them for signal-logic changes) do not describe the live decision rule at the boundaries.

## Fix direction

Make the live classifier inclusive (`>=` / `<=`) to match RULES.md, which tops the authority hierarchy. Do not edit RULES.md. Share one comparator between `generate-quant-signals.js` and `backtest.js`.
