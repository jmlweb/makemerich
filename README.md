# 💰 MakeMeRich

An AI-driven investment simulation experiment.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7Btype%3A%27line%27%2Cdata%3A%7Blabels%3A%5B%27Day+1%27%2C%27Day+2%27%2C%27Day+3%27%2C%27Day+4%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27Balance+%E2%82%AC%27%2Cdata%3A%5B5000%2C4975.68%2C4958.20%2C4600.11%5D%2CborderColor%3A%27%2336a2eb%27%2CbackgroundColor%3A%27rgba%2854%2C162%2C235%2C0.2%29%27%2Cfill%3Atrue%7D%5D%7D%2Coptions%3A%7Bscales%3A%7ByAxes%3A%5B%7Bticks%3A%7Bcallback%3A%28val%29%3D%3Eval%2B%27%E2%82%AC%27%2Cmin%3A4400%2Cmax%3A5200%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4,596.69 |
| Total Return | **-8.07%** |
| Days Active | 4 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 💵 Cash | 20.1% (€921.89) | — |
| 📈 VOO | 50.3% (€2,313.06) | +0.33% |
| 🥇 GLD | 14.4% (€659.72) | -4.53% |
| 📱 QQQ | 15.3% (€702.02) | +1.76% |

> **Day 4 Strategy Shift:** Sold BTC, deployed cash aggressively. Now 80% invested for growth.

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
├── README.md         # This file
├── LEDGER.md         # Daily log
├── STRATEGY.md       # Investment approach
├── HAL.md            # AI workflow
└── data/
    ├── trades/       # Monthly transaction logs
    ├── portfolio.json # Current state
    └── summary.json   # Historical totals
```

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Start | January 28, 2026 | ✅ |
| End (max) | January 27, 2027 | ⏳ |

---

*Experiment by [@jmlweb](https://github.com/jmlweb) and HAL 🤖*
