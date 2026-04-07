# MakeMeRich

An AI-driven investment simulation experiment.

| Metric | Value |
|--------|-------|
| Starting Capital | EUR 5,000.00 |
| Current Balance | EUR 4,256.60 |
| Total Return | **-14.87%** |
| Days Active | 53 |

![Portfolio Balance](https://quickchart.io/chart?c=%7Btype%3A%27line%27%2Cdata%3A%7Blabels%3A%5B%271%27%2C%272%27%2C%273%27%2C%274%27%2C%275%27%2C%276%27%2C%277%27%2C%278%27%2C%279%27%2C%2710%27%2C%2711%27%2C%2712%27%2C%2713%27%2C%2714%27%2C%2715%27%2C%2716%27%2C%2717%27%2C%2718%27%2C%2719%27%2C%2720%27%2C%2721%27%2C%2722%27%2C%2723%27%2C%2724%27%2C%2725%27%2C%2726%27%2C%2727%27%2C%2728%27%2C%2729%27%2C%2730%27%2C%2731%27%2C%2732%27%2C%2733%27%2C%2734%27%2C%2735%27%2C%2736%27%2C%2737%27%2C%2738%27%2C%2739%27%2C%2740%27%2C%2741%27%2C%2742%27%2C%2743%27%2C%2744%27%2C%2745%27%2C%2746%27%2C%2747%27%2C%2748%27%2C%2749%27%2C%2750%27%2C%2751%27%2C%2752%27%2C%2753%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27Balance%20(EUR)%27%2Cdata%3A%5B5000%2C4975.68%2C4958.2%2C4596.69%2C4610.73%2C4600.06%2C4545.93%2C4635.3%2C4666.81%2C4631.56%2C4588.43%2C4528.99%2C4620.53%2C4583.51%2C4580.69%2C4585.68%2C4593.48%2C4633.7%2C4534.9%2C4552.4%2C4707.77%2C4664.71%2C4593.74%2C4700.82%2C4647.7%2C4828.61%2C4749.02%2C4646.88%2C4682.12%2C4737.81%2C4730.38%2C4722.23%2C4745.85%2C4878.69%2C4884.56%2C4835.59%2C4754.27%2C4709.31%2C4716.37%2C4704.38%2C4753.81%2C4644.76%2C3768.05%2C3778.11%2C4235.32%2C4274.53%2C4267.56%2C4220.58%2C4221.71%2C4225.38%2C4216.34%2C4277.96%2C4256.6%5D%2CborderColor%3A%27%233b82f6%27%2CbackgroundColor%3A%27rgba(59%2C130%2C246%2C0.1)%27%2Cfill%3Atrue%2Ctension%3A0.2%2CpointRadius%3A0%7D%5D%7D%2Coptions%3A%7Bplugins%3A%7Bannotation%3A%7Bannotations%3A%7Bstart%3A%7Btype%3A%27line%27%2CyMin%3A5000%2CyMax%3A5000%2CborderColor%3A%27%23ef4444%27%2CborderWidth%3A1%2CborderDash%3A%5B5%2C5%5D%2Clabel%3A%7Benabled%3Atrue%2Ccontent%3A%27Start%27%2Cposition%3A%27start%27%7D%7D%7D%7D%7D%2Cscales%3A%7By%3A%7Bmin%3A3500%2Cmax%3A5200%7D%7D%7D%7D&w=600&h=300)

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| CASH | 49.7% (EUR 2,114) | -- |
| ETH | 28.3% (EUR 1,205) | +2.99% |
| 4GLD (Xetra-Gold) | 11.4% (EUR 487) | +3.70% |
| XEON (Money Market) | 10.6% (EUR 451) | +5.93% |

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
