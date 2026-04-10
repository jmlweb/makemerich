---
id: PLN-001
title: "Quant system v2: regime filter, deployment control, XEON base"
status: approved
created: 2026-04-07
revised: 2026-04-07
complexity: high
reviewed: 2026-04-07
task-id: TSK-001
---

## Why

The historical simulation (branch `adjusted`) proved the quant system beats narrative trading (-11.69% vs -14.85%), but it still lost ~12% in the Jan–Apr 2026 period. Analysis identified two root causes:

1. **No market regime awareness** — the system bought MC and AIR on Day 2 with 74% of capital while the market was topping. Trend indicators are lagging; they don't see a turn coming.
2. **Deployment too fast** — ATR sizing is correct per-position, but deploying 74% in a single session means no dry powder when better entries appear after a correction.

Secondary improvements: XEON as productive cash base (3.5% APY) and regime-gated signal thresholds.

**Target outcome after changes:** re-run `simulate-history.js` and achieve max drawdown < 10%, final return > -5% (vs -11.69% current).

---

## Prerequisites

### 0. Port `simulate-history.js` to main

`simulate-history.js` (873 LOC) only exists on the `adjusted` branch. Cherry-pick or merge it into `main` before starting any implementation — it's the validation engine for everything else.

### 0b. Verify BTC data coverage

BTC is missing from the latest `.quant-signals-latest.json`. Check `data/history/BTC.json` completeness and ensure `generate-quant-signals.js` includes it. Fix before simulating.

---

## Phase A — Regime Filter (validate in isolation)

### A1. Market Regime Filter — `generate-quant-signals.js`

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

### A2. Regime-Gated Signal Thresholds — `execute-signals.js`

Adjust BUY threshold based on regime read from signals file:

| Regime | Min score to BUY | Min score to STRONG_BUY action |
|--------|-----------------|-------------------------------|
| risk-on | 20 (current) | 50 |
| risk-off | 50 (STRONG_BUY only, defensive assets only) | 50 |
| crisis | blocked | blocked (XEON exception) |

No change to SELL thresholds — exits always execute.

### A3. Wire regime into `simulate-history.js`

Add regime computation per simulated day:
- Load SP500 + VIX history
- Compute regime for each day
- Apply regime-gated thresholds from A2

### A4. Simulate and measure Phase A impact

Run simulation, compare vs -11.69% baseline. Record:
- Max drawdown
- Final return
- How many BUYs were blocked by regime filter
- Which days triggered risk-off / crisis

**Decision gate:** If Phase A alone achieves < 10% drawdown and > -5% return, Phase B becomes optional optimization. If not, proceed to Phase B. If results are worse than baseline, revisit VIX/SMA50 thresholds before continuing.

---

## Phase B — Deployment Control + XEON Parking (incremental)

### B1. Deployment Speed Control — `execute-signals.js`

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

Note: trade history is stored monthly in `data/trades/YYYY-MM.json` — velocity function must handle cross-month date ranges.

### B2. XEON as Productive Cash Base — `execute-signals.js`

Add auto-parking logic after processing all other orders:

```js
// If cash > 20% of portfolio AND XEON position < 15% of portfolio:
//   Generate BUY XEON order for (cash - 15% reserve)
// If a BUY order needs cash AND cash is insufficient:
//   Generate SELL XEON order to fund it (before skipping the buy)
```

XEON replaces the "bare cash" concept — the 5% min cash reserve becomes 5% XEON floor (not bare cash).

Caution: this adds two-step order logic (sell XEON → buy target). Simulation must handle intra-day order sequencing correctly.

### B3. Wire velocity + XEON into `simulate-history.js`

- Track deployment velocity across simulated days
- Include XEON auto-parking logic
- Handle intra-day order sequencing (XEON sell before target buy)

### B4. Simulate Phase A+B combined, compare vs Phase A-only

Record incremental improvement (or regression) from velocity cap and XEON parking separately.

---

## Phase C — Documentation

- `RULES.md`: Update position limits — replace "5% min cash" with "5% min XEON + cash combined". Add regime filter as a new rule.
- `STRATEGY.md`: Document the three regimes and their allowed actions.

Only after Phase A (or A+B) simulation results are confirmed.

---

## Implementation Order

1. **Prereq**: Port `simulate-history.js` to main, verify BTC data
2. **Phase A**: Regime filter → simulate → measure (decision gate)
3. **Phase B**: Velocity + XEON → simulate incrementally → measure
4. **Phase C**: Documentation (after validation)

---

## Acceptance Criteria

### Phase A
- [ ] `generate-quant-signals.js` outputs `marketRegime: { regime, sp500vsSma50, vix }` in signals file
- [ ] `execute-signals.js` blocks non-defensive BUYs in risk-off, all BUYs in crisis
- [ ] `simulate-history.js` applies regime filter per day
- [ ] Phase A simulation shows measurable improvement vs -11.69% baseline (record exact numbers)

### Phase B
- [ ] `execute-signals.js` caps daily deployment at 15% of portfolio
- [ ] `execute-signals.js` pauses BUYs when 5-day velocity > 30%
- [ ] `execute-signals.js` auto-generates BUY XEON when idle cash > 20%
- [ ] Phase A+B simulation shows max drawdown < 10% and return > -5%

### Phase C
- [ ] `RULES.md` and `STRATEGY.md` updated to reflect new rules

## Revision History
- [2026-04-07] Split into Phase A (regime) and Phase B (velocity + XEON) for isolated validation. Added prerequisites (port simulate-history.js to main, verify BTC data). Added decision gate after Phase A. Noted cross-month trade parsing for velocity and intra-day order sequencing for XEON parking.
