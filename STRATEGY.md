# Investment Strategy

## February 2026 Changes: Spanish Legal Compliance

### Identified Problem
US ETFs (VOO, GLD, QQQ) **are not legally accessible** to retail investors in Spain/EU due to PRIIPS/MiFID II regulations. Brokers that allow it operate in a grey area.

### Solution: UCITS ETFs
ETFs domiciled in Ireland/Luxembourg with KID documentation. Advantages:
- 100% legal in Spain
- US dividend withholding: 15% (vs 30% on US ETFs)
- Accumulating = no tax until you sell
- Same exposure, better tax efficiency

---

## Investment Framework

### Objective
Maximize risk-adjusted returns, legally in Spain.
No fixed target — the goal is the best possible outcome over the full year while respecting all risk limits.

### Target Allocation (Aggressive Growth)

| Category | % | Assets | Risk |
|----------|---|--------|------|
| Core Global | 25% | VWCE | Medium |
| US Growth | 20% | SXR8 / CSPX | Medium |
| Crypto | 25% | BTC 70%, ETH 30% | High |
| Tactical | 20% | Sectors, momentum | High |
| Cash | 10% | EUR | Low |

### Legal Alternatives Considered

| Type | Examples | Risk | Notes |
|------|----------|------|-------|
| Treasury Bills | Tesoro.es | Very low | ~3% APY, limited liquidity |
| P2P Lending | Mintos, Bondora | High | Diversify originators |
| Real Estate Crowdfunding | Urbanitae, Housers | High | Illiquid, specific projects |
| Physical Gold | BullionVault, 4GLD | Medium | Inflation hedge |
| Crypto | Kraken, Coinbase | Very high | Regulated in Spain |

---

## Trading Rules

See [HUSTLE.md](HUSTLE.md) for detailed entry/exit criteria and trading rules.

---

## Why This Strategy

1. **Core VWCE (25%)**: Diversified global exposure, low cost (0.22% TER)
2. **SXR8 (20%)**: Pure S&P 500, accumulating, TER 0.07%
3. **Crypto (25%)**: High-growth potential, regulated in Spain
4. **Tactical (20%)**: Flexibility for opportunities (hot sectors, events)
5. **Cash (10%)**: Dry powder for dips

---

## Spain Tax Reference

| Gain | Rate |
|------|------|
| Up to EUR 6,000 | 19% |
| EUR 6,000 - EUR 50,000 | 21% |
| EUR 50,000 - EUR 200,000 | 23% |
| > EUR 200,000 | 28% |

*You only pay tax when you sell. Accumulating ETFs = tax deferral.*

---

*Last updated: 2026-04-07 — Added market regimes, deployment velocity caps, XEON auto-parking*

---

## Equity Re-Entry Rules (added 2026-03-29)

After executing SXR8/VWCE stops on 27/03, cash is parked in XEON until all conditions are met:

**Re-entry trigger (all must be met):**
1. VIX < 22 (market exiting fear territory)
2. S&P500 trading above SMA50 (20 sessions)
3. No new tariffs announced in the last 2 weeks

**On activation:** liquidate XEON and redistribute per target allocation:
- 25% SXR8 (S&P 500)
- 20% VWCE (global)
- 20% tactical (EQQQ if NASDAQ recovers)
- Keep current crypto and 4GLD positions

**Money market as permanent position:**
Whenever >15% is in cash with no planned use within <2 weeks, move to XEON.

---

## Mandate History

### ~~Aggressive Maximization (2026-03-29)~~ — REVOKED 2026-04-07

**Revoked.** This mandate suspended position limits and authorized concentrated directional bets based on narrative analysis. Result: -15% drawdown in 53 days, underperforming cash. The mandate encouraged the exact behavior that caused losses.

**Post-mortem:** Narrative-driven decisions ("tariffs will crash markets") led to a 36% concentration in DXS3 (inverse S&P500) that has not paid off. Position limits exist for a reason.

---

## Updated Mandate — 2026-04-07: Quantitative Discipline + Regime Awareness

**Primary objective: data-driven decisions only. No narrative trading. Adapt to market regime.**

### Quantitative Signal Rules

1. **All entry/exit decisions must be backed by quantitative signals** from `generate-quant-signals.js`
2. **No position limits may be suspended** — the defaults in RULES.md are absolute
3. **No single thesis** (tariffs, recession, bull run) may drive more than 20% of portfolio allocation
4. **Leveraged and inverse ETFs** are restricted to max 15% of portfolio and require STRONG_BUY/STRONG_SELL signal
5. **The LLM's role** is execution, reporting, and monitoring — not market prediction

### Market Regimes (2026-04-07 addition)

Three regimes based on VIX and S&P 500 technical position:

| Regime | Condition | BUY Rule | Notes |
|--------|-----------|----------|-------|
| **risk-on** | VIX < 22, SP500 > SMA50 | Normal (score ≥ 20) | High confidence environment; deploy more aggressively |
| **risk-off** | VIX 22–30 OR SP500 < SMA50 | Defensive only (score ≥ 50) | Lower confidence; buy only XEON/4GLD with strong signals |
| **crisis** | VIX > 30 | Blocked except XEON | Extreme uncertainty; preserve capital, no new equity positions |

**Purpose:** Reduce false signals from technical indicators during regime changes. Prevents deploying into falling knives.

### Deployment Velocity Rules (2026-04-07 addition)

Control the speed at which capital is deployed to avoid concentrated bets:

- **Daily cap:** Max 15% of portfolio deployed per day (prevents all-in on day 1)
- **5-day brake:** Max 30% deployed in any rolling 5-day window (prevents rapid-fire deployments)
- **XEON auto-parking:** When cash exceeds 20% of portfolio, auto-BUY XEON (productive cash base earning 3.5% APY)

**Rationale:** Simulation shows that spreading buys across multiple days yields better entry points. The aggressive Day 2 all-in with 74% deployment in baseline lost the most in subsequent drawdowns.

### Allowed Investment Universe

All UCITS ETFs, ETCs, and regulated crypto from ASSETS.md. No leveraged products above 1x unless the quantitative signal system produces a STRONG signal AND position sizing rules are respected.
