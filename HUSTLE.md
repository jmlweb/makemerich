# HUSTLE.md — Decision Criteria

> For schedule, scripts, data sources, and alerts see [AGENTS.md](AGENTS.md).

## My Role

I am the autonomous manager of this portfolio. I make decisions based on data, not emotions. I document everything. I learn from my mistakes.

> **Note (2026-10-18):** Since 2026-04-07 no agent decides trades. The live pipeline is fully mechanical (see "Live Decision Logic" below). Most tables in this file predate that pivot. Rows marked **not enforced** are aspirations the live code does not implement. They are not active rules. Rule status lives in the AGENTS.md "Rule Enforcement Map"; gaps are in FINDINGS.md 2026-10-18. Whether to implement or revoke them is Jose's call.

---

## Live Decision Logic (as of 2026-10-18)

What the code actually does, in order. This section describes behavior; it does not change it.

1. **Score** — `generate-quant-signals.js` computes a composite score in [−100, 100] per asset from price history only. Weights: trend 0.25 (SMA20/50/200), momentum 0.25 (RSI14), meanReversion 0.20 (Bollinger), macd 0.15, volatility 0.15 (ATR14 change).
2. **Classify** — STRONG_BUY ≥ 50, BUY ≥ 20, SELL < −20, STRONG_SELL < −50, else HOLD.
3. **Regime gate** — crisis (VIX > 30): only XEON may be bought. Risk-off (VIX 22–30 or S&P 500 below SMA50): only XEON/4GLD, and only at score ≥ 50. Risk-on: normal thresholds.
4. **BUY** — only for assets **not already held** (no adding to positions) and not sold in the last 48h (cooldown). Size = 2% of balance ÷ stop distance, where stop = price − 2×ATR14. Capped by available bare cash above the 5% reserve, the 50% single-position cap, and the high-risk/inverse caps. Orders under EUR 50 are dropped.
5. **SELL** — SELL sells 50% of the position; STRONG_SELL sells 100%. A 50% sell that would leave less than EUR 50 sells 100%. Holdings worth < EUR 1 are cleared by a `DUST_CLEANUP` sell.
6. **Limit corrections** — automatic SELL orders for high-risk > 30%, inverse/leveraged > 15%, and any single position > 50% (trimmed back to 48%, minimum order EUR 50).
7. **Apply** — `apply-trades.js` executes the orders and writes the stop price once onto a new holding.
8. **Stops & take-profit** — `stoploss-watch.sh` (every 5 min) sells 100% when price ≤ `stop_loss_eur`, and 25% at +30% / +50% P&L (once per level). `update-portfolio.js` raises each stop to 90% of the holding's high price every session (trailing stop, RULES §6); stops never move down.

---

## Entry Criteria (BUY)

### Technical Signals

| Signal | Condition | Confidence |
|--------|-----------|------------|
| RSI Oversold | RSI(14) < 30 | High if uptrend |
| Support | Price touches strong support + bounce | Medium |
| Extreme Fear | Fear & Greed < 25 | High (contrarian) |
| Golden Cross | SMA50 crosses SMA200 up | High (long term) |

> RSI and SMA trend feed the live composite score (steps 1–2 above). Support levels and Fear & Greed are **not enforced** — no live script computes them.

### Fundamental Signals

> **Not enforced** — the pipeline uses price history only (AGENTS.md "Data Sources"). Acting on these would be narrative trading (CLAUDE.md invariant 1).

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

> Live equivalent: cash and limits are checked by `execute-signals.js`; the stop is always defined (2×ATR14). "Clear thesis" has no live meaning — the quant score is the only thesis.

---

## Exit Criteria (SELL)

### Stop Loss (mandatory)

| Type | Trigger | Action |
|------|---------|--------|
| Hard Stop | -15% from entry | Sell 100% |
| Trailing Stop | -10% from high | Sell 100% |
| Portfolio Stop | Balance < EUR 1,000 | Conservation mode |

> **Live behavior differs:** the hard stop is 2×ATR14 below entry (currently 1.7%–11.7% below entry, excluding the 4GLD dust), not −15%. The trailing stop is enforced since 2026-10-18 by `update-portfolio.js` (high tracked from max(entry, price) at that date; FINDINGS.md 2026-10-18 A3). The portfolio stop is reported by `validate-rules.js` but changes no behavior.

### Take Profit

| Level | Trigger | Action |
|-------|---------|--------|
| Partial | +30% from entry | Sell 25% |
| Second | +50% from entry | Sell another 25% |
| Trailing | Let it run with trailing stop | |

> Live: `stoploss-watch.sh` implements the +30% / +50% partial sells, each once per position (`tp_taken` on the holding; FINDINGS.md 2026-10-18 A1, fixed). The trailing row is enforced by the trailing stop (A3).

### Exit Signals

| Signal | Condition | Action |
|--------|-----------|--------|
| RSI Overbought | RSI(14) > 70 + divergence | Reduce |
| Support Broken | Closes below key support | Exit |
| Thesis Broken | Fundamental changed | Exit |
| Better Opportunity | Superior risk/reward | Rotate |

> Live exits are only: quant SELL/STRONG_SELL (step 5), limit corrections (step 6), and stop/take-profit (step 8). "Thesis broken" and "Better opportunity" are **not enforced** and would be discretionary.

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

> "Maximum 2 trades per week" is **not enforced** (2026-08-11 alone had 6 trades). The 48h re-entry cooling-off from LEARNINGS.md 2026-03-18 is enforced since 2026-10-18 by `execute-signals.js` (FINDINGS.md 2026-10-18 A6).

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

> As of 2026-10-18, steps 1–4 run inside `session.sh` / `daily-update.sh` and step 4 is `apply-trades.js`. No agent executes trades (AGENTS.md "Order of Operations").

**The agent may NOT override quantitative signals based on narrative analysis.**
If the signal says HOLD, the action is HOLD. If the signal says SELL, the action is SELL.

---

*This document evolves with learnings. See [LEARNINGS.md](LEARNINGS.md) for history.*
