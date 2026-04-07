---
id: PLN-001
title: Quant system v2: regime filter, deployment control, XEON base
status: pending
created: 2026-04-07
complexity: high
---

## Why

The historical simulation (branch `adjusted`) proved the quant system beats narrative trading (-11.69% vs -14.85%), but it still lost ~12% in the Jan–Apr 2026 period. Analysis identified two root causes:

1. **No market regime awareness** — the system bought MC and AIR on Day 2 with 74% of capital while the market was topping. Trend indicators are lagging; they don't see a turn coming.
2. **Deployment too fast** — ATR sizing is correct per-position, but deploying 74% in a single session means no dry powder when better entries appear after a correction.

Secondary improvements: XEON as productive cash base (3.5% APY) and regime-gated signal thresholds.

**Target outcome after changes:** re-run `simulate-history.js` and achieve max drawdown < 10%, final return > -5% (vs -11.69% current).

---

## Changes

### 1. Market Regime Filter — `generate-quant-signals.js`

Add a `computeMarketRegime()` function that runs before asset analysis:

```js
// Uses data/history/SP500.json + data/history/VIX.json
function computeMarketRegime(sp500History, vixHistory) {
  // SP500: price vs SMA50
  // VIX: latest close
  // Returns: { regime: 'risk-on' | 'risk-off' | 'crisis', sp500vsSma50: %, vix: n }
}
```

Regime rules:
- `risk-on`: SP500 > SMA50 AND VIX < 22
- `risk-off`: SP500 < SMA50 OR VIX 22–30
- `crisis`: VIX > 30

Output the regime in `.quant-signals-latest.json` root so `execute-signals.js` can read it.

**Defensive assets** (allowed to receive BUY in risk-off): `XEON`, `4GLD`  
**All assets** blocked from new BUY in `crisis` except `XEON`

### 2. Regime-Gated Signal Thresholds — `execute-signals.js`

Adjust BUY threshold based on regime read from signals file:

| Regime | Min score to BUY | Min score to STRONG_BUY action |
|--------|-----------------|-------------------------------|
| risk-on | 20 (current) | 50 |
| risk-off | 50 (STRONG_BUY only, defensive assets only) | 50 |
| crisis | blocked | blocked (XEON exception) |

No change to SELL thresholds — exits always execute.

### 3. Deployment Speed Control — `execute-signals.js`

Add a `computeDeploymentVelocity()` function:

```js
// Reads data/trades/ files for last 5 trading days
// Returns total EUR deployed (buys only) as % of portfolio
function computeDeploymentVelocity(tradesDir, portfolioBalance) { ... }
```

Rules:
- Max new deployment per session: 15% of portfolio
- If velocity (last 5 days) > 30%: block all new BUY orders, emit warning
- Per-order cap already exists (ATR sizing) — this adds a session-level cap on top

Store deployment velocity in the output `.trade-orders.json` for transparency.

### 4. XEON as Productive Cash Base — `execute-signals.js`

Add auto-parking logic after processing all other orders:

```js
// If cash > 20% of portfolio AND XEON position < 15% of portfolio:
//   Generate BUY XEON order for (cash - 15% reserve)
// If a BUY order needs cash AND cash is insufficient:
//   Generate SELL XEON order to fund it (before skipping the buy)
```

XEON replaces the "bare cash" concept — the 5% min cash reserve becomes 5% XEON floor (not bare cash).

### 5. Update `simulate-history.js` for Validation

Add regime filter and deployment velocity to the simulation engine so we can validate the full improvement before deploying to production. The simulation should:
- Load SP500 + VIX history
- Compute regime per day
- Apply regime-gated thresholds
- Track deployment velocity across days
- Include XEON auto-parking

Run on `adjusted` branch after implementation, compare results.

### 6. Documentation

- `RULES.md`: Update position limits — replace "5% min cash" with "5% min XEON + cash combined". Add regime filter as a new rule.
- `STRATEGY.md`: Document the three regimes and their allowed actions.

---

## Implementation Order

1. `generate-quant-signals.js` — add `computeMarketRegime()`, include in output
2. `execute-signals.js` — read regime, apply thresholds, add deployment velocity, add XEON auto-parking
3. `simulate-history.js` — add regime + velocity + XEON to validate full system
4. Run simulation, compare vs -11.69% baseline
5. `RULES.md` + `STRATEGY.md` — document new rules

---

## Acceptance Criteria

- [ ] `generate-quant-signals.js` outputs `marketRegime: { regime, sp500vsSma50, vix }` in signals file
- [ ] `execute-signals.js` blocks non-defensive BUYs in risk-off, all BUYs in crisis
- [ ] `execute-signals.js` caps daily deployment at 15% of portfolio
- [ ] `execute-signals.js` pauses BUYs when 5-day velocity > 30%
- [ ] `execute-signals.js` auto-generates BUY XEON when idle cash > 20%
- [ ] Updated `simulate-history.js` shows max drawdown < 10% and return > -5%
- [ ] `RULES.md` and `STRATEGY.md` updated to reflect new rules
