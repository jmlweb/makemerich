# 💰 MakeMeRich

An AI-driven investment simulation experiment.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Day%201%22%2C%22Day%202%22%2C%22Day%203%22%2C%22Day%204%22%2C%22Day%205%22%2C%22Day%206%22%2C%22Day%207%22%2C%22Day%208%22%2C%22Day%209%22%2C%22Day%2010%22%2C%22Day%2011%22%2C%22Day%2012%22%2C%22Day%2013%22%2C%22Day%2014%22%2C%22Day%2015%22%2C%22Day%2016%22%2C%22Day%2017%22%2C%22Day%2018%22%2C%22Day%2019%22%2C%22Day%2020%22%2C%22Day%2021%22%2C%22Day%2022%22%2C%22Day%2023%22%2C%22Day%2024%22%2C%22Day%2025%22%2C%22Day%2026%22%2C%22Day%2027%22%2C%22Day%2028%22%2C%22Day%2029%22%2C%22Day%2030%22%2C%22Day%2031%22%2C%22Day%2032%22%2C%22Day%2033%22%2C%22Day%2034%22%2C%22Day%2035%22%2C%22Day%2036%22%2C%22Day%2037%22%2C%22Day%2038%22%2C%22Day%2039%22%2C%22Day%2040%22%2C%22Day%2041%22%2C%22Day%2042%22%2C%22Day%2043%22%2C%22Day%2044%22%2C%22Day%2045%22%2C%22Day%2046%22%2C%22Day%2047%22%2C%22Day%2048%22%2C%22Day%2049%22%2C%22Day%2050%22%2C%22Day%2051%22%2C%22Day%2052%22%2C%22Day%2053%22%2C%22Day%2054%22%2C%22Day%2055%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B%225000.00%22%2C%225000.00%22%2C%224975.68%22%2C%224958.20%22%2C%224596.69%22%2C%224610.73%22%2C%224600.06%22%2C%224545.93%22%2C%224635.30%22%2C%224666.81%22%2C%224631.56%22%2C%224588.43%22%2C%224528.99%22%2C%224620.53%22%2C%224583.51%22%2C%224580.69%22%2C%224585.68%22%2C%224593.48%22%2C%224633.70%22%2C%224534.90%22%2C%224552.40%22%2C%224707.77%22%2C%224664.71%22%2C%224593.74%22%2C%224700.82%22%2C%224647.70%22%2C%224828.61%22%2C%224749.02%22%2C%224646.88%22%2C%224682.12%22%2C%224737.81%22%2C%224730.38%22%2C%224722.23%22%2C%224745.85%22%2C%224878.69%22%2C%224884.56%22%2C%224835.59%22%2C%224754.27%22%2C%224709.31%22%2C%224716.37%22%2C%224704.38%22%2C%224753.81%22%2C%224644.76%22%2C%223768.05%22%2C%223778.11%22%2C%224235.32%22%2C%224274.53%22%2C%224267.56%22%2C%224220.58%22%2C%224221.71%22%2C%224225.38%22%2C%224216.34%22%2C%224277.96%22%2C%224257.54%22%2C%224311.31%22%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba(54%2C162%2C235%2C0.2)%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4311.31 |
| Total Return | **-13.77%** |
| Days Active | 54 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 💵 CASH | 42.3% (€2113.55) | — |
| 📊 ETH | 25.1% (€1253.18) | +7.61% |
| 📊 4GLD | 9.9% (€493.43) | +5.07% |
| 📊 XEON | 9.0% (€451.14) | +5.93% |

> **Day 54 Close:** ETH +7.61%, 4GLD +5.07%.

## What is this?

A public experiment where **Hustle** (AI powered by Claude) makes investment decisions with €5,000 of simulated capital.

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

Hustle monitors markets 5x daily (09:00, 12:00, 15:30, 18:00, 21:30 CET) and:
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

*Last updated: 2026-04-08 by Hustle 🤖*
