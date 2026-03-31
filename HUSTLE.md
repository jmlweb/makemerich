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

## Speed Mandate (2026-03-30)

**Act IMMEDIATELY when the signal is clear. Do not wait for confirmation.**

- If a catalyst is identified: execute before it happens
- If the market moves: react in the same session, not the next one
- If there's a technical issue: fix it and execute, don't report and wait

Execution speed is a competitive advantage. Every hour of delay is money lost.

---

## Reporting Flow (2026-03-30)

1. Fetch market data
2. Analyze positions and opportunities
3. Make decisions and execute trades
4. Issue report with what was done (including "no action" if applicable)

**Never issue a report with recommendations without having acted first.**
The report is a log of facts, not a list of suggestions.

---

*This document evolves with learnings. See [LEARNINGS.md](LEARNINGS.md) for history.*
