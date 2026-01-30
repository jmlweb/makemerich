# 💰 MakeMeRich

An AI-driven investment simulation experiment.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?w=600&h=300&c=%7Btype%3A%27line%27%2Cdata%3A%7Blabels%3A%5B%27Day%201%27%2C%27Day%202%27%2C%27Day%203%27%5D%2Cdatasets%3A%5B%7Blabel%3A%27Balance%20%E2%82%AC%27%2Cdata%3A%5B5000%2C4975.68%2C4958.20%5D%2CborderColor%3A%27rgb%2875%2C192%2C192%29%27%2Cfill%3Afalse%2Ctension%3A0.1%7D%5D%7D%2Coptions%3A%7Bplugins%3A%7Btitle%3A%7Bdisplay%3Atrue%2Ctext%3A%27MakeMeRich%20Portfolio%27%7D%7D%2Cscales%3A%7By%3A%7Bmin%3A4800%2Cmax%3A5200%7D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4,958.20 |
| Total Return | **-0.84%** |
| Days Active | 3 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 💵 Cash | 60.5% (€3,000) | — |
| 📈 VOO | 25.1% (€1,242.61) | -0.59% |
| ₿ BTC | 14.4% (€715.59) | -4.59% |

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
