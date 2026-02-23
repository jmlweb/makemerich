# 💰 MakeMeRich

An AI-driven investment simulation experiment.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Day%201%22%2C%22Day%202%22%2C%22Day%203%22%2C%22Day%204%22%2C%22Day%205%22%2C%22Day%206%22%2C%22Day%207%22%2C%22Day%208%22%2C%22Day%209%22%2C%22Day%2010%22%2C%22Day%2011%22%2C%22Day%2012%22%2C%22Day%2013%22%2C%22Day%2014%22%2C%22Day%2015%22%2C%22Day%2016%22%2C%22Day%2017%22%2C%22Day%2018%22%2C%22Day%2019%22%2C%22Day%2020%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B%225000.00%22%2C%225000.00%22%2C%224975.68%22%2C%224958.20%22%2C%224596.69%22%2C%224610.73%22%2C%224600.06%22%2C%224545.93%22%2C%224635.30%22%2C%224666.81%22%2C%224631.56%22%2C%224588.43%22%2C%224528.99%22%2C%224620.53%22%2C%224583.51%22%2C%224580.69%22%2C%224585.68%22%2C%224593.48%22%2C%224633.70%22%2C%224534.90%22%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba(54%2C162%2C235%2C0.2)%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4428.99%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4534.90 |
| Total Return | **-9.30%** |
| Days Active | 19 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 SXR8 | 27.2% (€1362.22) | +0.02% |
| 📊 VWCE | 22.0% (€1099.88) | +3.79% |
| ₿ BTC | 17.4% (€869.13) | -4.28% |
| 📊 ETH | 12.4% (€619.26) | -5.57% |
| 📊 SGLD | 9.6% (€479.83) | +5.91% |
| 💵 CASH | 2.1% (€104.58) | — |

> **Day 19 Close:** SGLD +5.91%, ETH -5.57%.

## What is this?

A public experiment where **HAL** (AI powered by Claude) makes investment decisions with €5,000 of simulated capital.

**This is NOT financial advice.** Simulation for educational/entertainment purposes only.

## Rules

1. **Legal investments only** — anything legal in Spain
2. **Real market data** — actual prices and conditions
3. **Full transparency** — all decisions and reasoning public
4. **No private data** — nothing confidential published

## End Conditions

- 📉 Balance reaches €0 (game over)
- 📅 One year passes (January 27, 2027)
- 🏆 Balance reaches €50,000 (10x victory!)

## How it works

HAL monitors markets 5x daily (09:00, 12:00, 15:30, 18:00, 21:30 CET) and:
1. Fetches real market data
2. Analyzes conditions
3. Makes buy/sell decisions
4. Records everything in [LEDGER.md](LEDGER.md)

## Structure

```
makemerich/
├── README.md         # This file (auto-updated)
├── LEDGER.md         # Daily log
├── STRATEGY.md       # Investment approach
├── data/             # Historical JSON data
└── scripts/          # Automation scripts
```

## Links

- 📊 [Live Dashboard](dashboard.html)
- 📒 [Investment Ledger](LEDGER.md)
- 📋 [Strategy Document](STRATEGY.md)

---

*Last updated: 2026-02-23 by HAL 🤖*
