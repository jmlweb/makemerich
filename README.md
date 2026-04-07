# MakeMeRich

An AI-driven investment simulation experiment.

| Metric | Value |
|--------|-------|
| Starting Capital | EUR 5,000.00 |
| Current Balance | EUR 4,245.18 |
| Total Return | **-15.10%** |
| Days Active | 53 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| DXS3 (S&P500 Inverse) | 36.0% (EUR 1,529) | -3.20% |
| ETH | 28.1% (EUR 1,192) | +1.88% |
| 4GLD (Xetra-Gold) | 11.5% (EUR 487) | +3.70% |
| XEON (Money Market) | 10.6% (EUR 451) | +5.93% |
| CASH | 13.8% (EUR 586) | -- |

## What is this?

A public experiment where **Hustle** (AI powered by Claude) manages EUR 5,000 of simulated capital.

**This is NOT financial advice.** Simulation for educational/entertainment purposes only.

## How it works

Since Day 53 (2026-04-07), trading decisions are made by a **quantitative signal system**, not by LLM narrative analysis. The AI executes mechanical rules — it does not predict markets.

1. `fetch-history.js` — fetches 1 year of daily OHLCV data
2. `indicators.js` — computes SMA, EMA, RSI, MACD, Bollinger Bands, ATR
3. `generate-quant-signals.js` — produces composite BUY/SELL/HOLD signals
4. `execute-signals.js` — converts signals into binding trade orders with position sizing
5. `backtest.js` — validates strategy against historical data

Sessions run Mon-Fri at 09:00, 12:00, 15:30, 18:00, 21:30 CET.

## Rules

1. **Legal investments only** -- UCITS ETFs and regulated crypto, legal in Spain
2. **Real market data** -- actual prices from Yahoo Finance
3. **Full transparency** -- all decisions and reasoning public
4. **Quantitative signals only** -- no narrative-driven trades
5. **Position limits are absolute** -- max 50% single position, 15% inverse/leveraged, 30% high-risk

## Structure

```
makemerich/
├── AGENTS.md         # Agent workflow, schedule, tooling
├── HUSTLE.md         # Decision criteria (quantitative only)
├── RULES.md          # Game rules (immutable, no overrides)
├── STRATEGY.md       # Investment philosophy + mandates
├── LEDGER.md         # Daily log
├── SIGNALS.md        # Active signals and alerts
├── ASSETS.md         # Available instruments
├── LEARNINGS.md      # Lessons learned
├── data/             # Portfolio state, trades, historical data
└── scripts/          # Quantitative pipeline + automation
```

## Links

- [Investment Ledger](LEDGER.md)
- [Strategy Document](STRATEGY.md)
- [Learnings](LEARNINGS.md)

---

*Last updated: 2026-04-07 by Hustle*
