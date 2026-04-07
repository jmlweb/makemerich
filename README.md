# MakeMeRich

An AI-driven investment simulation experiment.

| Metric | Value |
|--------|-------|
| Starting Capital | EUR 5,000.00 |
| Current Balance | EUR 4,663.70 |
| Total Return | **-6.73%** |
| Max Drawdown | -9.60% |
| Days Active | 49 |

![Portfolio Balance](https://quickchart.io/chart?c=%7Btype%3A%27line%27%2Cdata%3A%7Blabels%3A%5B%271%27%2C%272%27%2C%273%27%2C%274%27%2C%275%27%2C%276%27%2C%277%27%2C%278%27%2C%279%27%2C%2710%27%2C%2711%27%2C%2712%27%2C%2713%27%2C%2714%27%2C%2715%27%2C%2716%27%2C%2717%27%2C%2718%27%2C%2719%27%2C%2720%27%2C%2721%27%2C%2722%27%2C%2723%27%2C%2724%27%2C%2725%27%2C%2726%27%2C%2727%27%2C%2728%27%2C%2729%27%2C%2730%27%2C%2731%27%2C%2732%27%2C%2733%27%2C%2734%27%2C%2735%27%2C%2736%27%2C%2737%27%2C%2738%27%2C%2739%27%2C%2740%27%2C%2741%27%2C%2742%27%2C%2743%27%2C%2744%27%2C%2745%27%2C%2746%27%2C%2747%27%2C%2748%27%2C%2749%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27Balance%20(EUR)%27%2Cdata%3A%5B5000%2C4999.2%2C4998.38%2C5004.43%2C4992.67%2C4978.17%2C4997.22%2C4993.06%2C5002.8%2C5006.26%2C4983.2%2C4944.05%2C4944.33%2C4924.46%2C4931.6%2C4955.2%2C4982.87%2C4977.52%2C5030.43%2C5037.54%2C5042.34%2C5051.19%2C5047.03%2C5021.09%2C4949.29%2C4820.35%2C4879.68%2C4844.72%2C4807.24%2C4763.66%2C4858.14%2C4842.91%2C4814.28%2C4770.43%2C4779.87%2C4778.11%2C4744.88%2C4633.71%2C4596.35%2C4599.73%2C4596.8%2C4657.75%2C4600.33%2C4566.51%2C4590.5%2C4599.51%2C4735.33%2C4705.03%2C4663.7%5D%2CborderColor%3A%27%233b82f6%27%2CbackgroundColor%3A%27rgba(59%2C130%2C246%2C0.1)%27%2Cfill%3Atrue%2Ctension%3A0.2%2CpointRadius%3A0%7D%5D%7D%2Coptions%3A%7Bplugins%3A%7Bannotation%3A%7Bannotations%3A%7Bstart%3A%7Btype%3A%27line%27%2CyMin%3A5000%2CyMax%3A5000%2CborderColor%3A%27%23ef4444%27%2CborderWidth%3A1%2CborderDash%3A%5B5%2C5%5D%2Clabel%3A%7Benabled%3Atrue%2Ccontent%3A%27Start%27%2Cposition%3A%27start%27%7D%7D%7D%7D%7D%2Cscales%3A%7By%3A%7Bmin%3A4400%2Cmax%3A5200%7D%7D%7D%7D&w=600&h=300)

## Current Positions (simulated)

| Asset | Allocation | P/L |
|-------|------------|-----|
| SXR8 (S&P 500) | 15.7% (EUR 731) | -2.99% |
| ALV (Allianz) | 15.4% (EUR 716) | -3.97% |
| VWCE (All-World) | 15.3% (EUR 715) | -3.46% |
| SIE (Siemens) | 15.2% (EUR 710) | +3.07% |
| 4GLD (Xetra-Gold) | 15.1% (EUR 705) | -5.47% |
| ITX (Inditex) | 14.2% (EUR 662) | -11.50% |
| ASML | 3.9% (EUR 184) | -11.84% |
| CASH | 5.1% (EUR 239) | -- |

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
