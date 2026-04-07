# HUSTLE.md — Decision Criteria

> For schedule, scripts, data sources, and alerts see [AGENTS.md](AGENTS.md).

## My Role

I am the autonomous manager of this portfolio. I make decisions based on data, not emotions. I document everything. I learn from my mistakes.

---

## Entry Criteria (BUY)

### Technical Signals

| Signal | Condition | Confidence |
|--------|-----------|------------|
| RSI Oversold | RSI(14) < 30 | High if uptrend |
| Support | Price touches strong support + bounce | Medium |
| Extreme Fear | Fear & Greed < 25 | High (contrarian) |
| Golden Cross | SMA50 crosses SMA200 up | High (long term) |

### Fundamental Signals

| Signal | Condition | Confidence |
|--------|-----------|------------|
| Earnings Beat | Beats estimates + guidance up | High |
| Sector Rotation | Flow into specific sector | Medium |
| Favorable Macro | Fed dovish, good economic data | Medium |

### Sizing Rules

```
Position size = (Portfolio x Max Risk) / Stop Distance

Example:
- Portfolio: EUR 5,000
- Max risk per trade: 2% = EUR 100
- Stop loss: 10% below entry
- Max size: EUR 100 / 0.10 = EUR 1,000
```

### Pre-buy checklist

- [ ] Enough cash? (minimum 5% must remain)
- [ ] Not exceeding single-position limit? (see RULES.md § 4)
- [ ] Clear thesis?
- [ ] Stop loss defined?

---

## Exit Criteria (SELL)

### Stop Loss (mandatory)

| Type | Trigger | Action |
|------|---------|--------|
| Hard Stop | -15% from entry | Sell 100% |
| Trailing Stop | -10% from high | Sell 100% |
| Portfolio Stop | Balance < EUR 1,000 | Conservation mode |

### Take Profit

| Level | Trigger | Action |
|-------|---------|--------|
| Partial | +30% from entry | Sell 25% |
| Second | +50% from entry | Sell another 25% |
| Trailing | Let it run with trailing stop | |

### Exit Signals

| Signal | Condition | Action |
|--------|-----------|--------|
| RSI Overbought | RSI(14) > 70 + divergence | Reduce |
| Support Broken | Closes below key support | Exit |
| Thesis Broken | Fundamental changed | Exit |
| Better Opportunity | Superior risk/reward | Rotate |

---

## Indicators to Review

| Indicator | Why |
|-----------|-----|
| S&P 500 | General trend |
| VIX | Volatility/fear |
| DXY | Dollar strength (affects commodities) |
| US10Y | Yields (affects growth stocks) |
| Fear & Greed Index | Sentiment |

---

## Mistakes to Avoid

| Mistake | Prevention |
|---------|------------|
| FOMO | Only enter with clear signal |
| Overtrading | Maximum 2 trades per week |
| Averaging down | Only with intact thesis + plan |
| Ignoring stops | Stops are sacred |
| Confirmation bias | Look for counter-arguments |

---

## ~~Speed Mandate (2026-03-30)~~ — REVOKED 2026-04-07

**Revoked.** "Act immediately" led to impulsive trades without quantitative backing (e.g., NATO entered without analysis, -12.4%). Speed without edge is just faster losing.

**Replaced by:** Execute only when `generate-quant-signals.js` produces a BUY or SELL signal. No narrative-driven trades. No "catalyst" predictions.

---

## Decision Flow (2026-04-07)

1. Run `pre-session.sh` (fetches data, computes indicators, generates quant signals)
2. Read `.quant-signals-latest.json` for actionable signals
3. Run `execute-signals.js` for trade recommendations with position sizing
4. Execute recommended trades (or HOLD if no signals)
5. Report what was done — the report is a log of facts

**The agent may NOT override quantitative signals based on narrative analysis.**
If the signal says HOLD, the action is HOLD. If the signal says SELL, the action is SELL.

---

*This document evolves with learnings. See [LEARNINGS.md](LEARNINGS.md) for history.*
