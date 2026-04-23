# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Day%201%22%2C%22Day%202%22%2C%22Day%203%22%2C%22Day%204%22%2C%22Day%205%22%2C%22Day%206%22%2C%22Day%207%22%2C%22Day%208%22%2C%22Day%209%22%2C%22Day%2010%22%2C%22Day%2011%22%2C%22Day%2012%22%2C%22Day%2013%22%2C%22Day%2014%22%2C%22Day%2015%22%2C%22Day%2016%22%2C%22Day%2017%22%2C%22Day%2018%22%2C%22Day%2019%22%2C%22Day%2020%22%2C%22Day%2021%22%2C%22Day%2022%22%2C%22Day%2023%22%2C%22Day%2024%22%2C%22Day%2025%22%2C%22Day%2026%22%2C%22Day%2027%22%2C%22Day%2028%22%2C%22Day%2029%22%2C%22Day%2030%22%2C%22Day%2031%22%2C%22Day%2032%22%2C%22Day%2033%22%2C%22Day%2034%22%2C%22Day%2035%22%2C%22Day%2036%22%2C%22Day%2037%22%2C%22Day%2038%22%2C%22Day%2039%22%2C%22Day%2040%22%2C%22Day%2041%22%2C%22Day%2042%22%2C%22Day%2043%22%2C%22Day%2044%22%2C%22Day%2045%22%2C%22Day%2046%22%2C%22Day%2047%22%2C%22Day%2048%22%2C%22Day%2049%22%2C%22Day%2050%22%2C%22Day%2051%22%2C%22Day%2052%22%2C%22Day%2053%22%2C%22Day%2054%22%2C%22Day%2055%22%2C%22Day%2056%22%2C%22Day%2057%22%2C%22Day%2058%22%2C%22Day%2059%22%2C%22Day%2060%22%2C%22Day%2061%22%2C%22Day%2062%22%2C%22Day%2063%22%2C%22Day%2064%22%2C%22Day%2065%22%2C%22Day%2066%22%2C%22Day%2067%22%2C%22Day%2068%22%2C%22Day%2069%22%2C%22Day%2070%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C5000%2C4975.68%2C4958.2%2C4596.69%2C4610.73%2C4600.06%2C4545.93%2C4635.3%2C4666.81%2C4631.56%2C4588.43%2C4528.99%2C4620.53%2C4583.51%2C4580.69%2C4585.68%2C4593.48%2C4633.7%2C4534.9%2C4552.4%2C4707.77%2C4664.71%2C4593.74%2C4700.82%2C4647.7%2C4828.61%2C4749.02%2C4646.88%2C4682.12%2C4737.81%2C4730.38%2C4722.23%2C4745.85%2C4878.69%2C4884.56%2C4835.59%2C4754.27%2C4709.31%2C4716.37%2C4704.38%2C4753.81%2C4644.76%2C3768.05%2C3778.11%2C4235.32%2C4274.53%2C4267.56%2C4220.58%2C4221.71%2C4225.38%2C4216.34%2C4277.96%2C4257.54%2C4311.31%2C4302.1%2C4322.76%2C4313.53%2C4304.97%2C4314.02%2C4387.99%2C4427.82%2C4446.11%2C4518.94%2C4506.51%2C4456.71%2C4459.79%2C4451.46%2C4532.05%2C4506.66%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4506.66 |
| Total Return | **-9.87%** |
| Days Active | 69 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 40.8% (€2038.60) | +7.42% |
| 📊 ETH | 26.3% (€1312.72) | +13.69% |
| 📊 4GLD | 9.8% (€490.04) | +4.34% |
| 📊 XEON | 9.0% (€451.52) | +6.02% |
| 💵 CASH | 4.3% (€213.78) | — |

> **Day 69 Close:** ETH +13.69%, 4GLD +4.34%.


## What is this?

A public experiment where an AI system manages €5,000 of simulated capital, making real investment decisions based on real market data.

**This is NOT financial advice.** Simulation for educational/entertainment purposes only.

## How it evolved

The system has gone through two distinct phases:

### Phase 1: Autonomous AI (Days 1-43)

Claude (Anthropic's AI) had full control. It analyzed markets, chose assets, decided position sizes, and executed trades — all autonomously. The AI agent ran 5x daily via cron, using tools (file editing, shell commands) to directly modify the portfolio.

Results: the AI made some good calls (ETH, gold) but also costly ones (a large inverse S&P 500 bet that went wrong). More importantly, the automation was fragile — the agent would timeout, exhaust its turn limit, or fail silently. When it worked, it consumed thousands of tokens per session on tasks that didn't require intelligence.

### Phase 2: Quantitative system + AI analysis (Day 44+)

After analyzing the failures with Claude, we redesigned the architecture around a principle: **if it doesn't require reasoning, don't use AI for it**.

Now the system works like this:
- **Deterministic scripts** handle everything mechanical: fetching prices, computing signals (SMA, RSI, MACD, ATR), generating trade orders, applying trades to the portfolio, writing the daily log, git commits, and sending Telegram reports
- **Claude** does one thing: reads the pre-computed data and writes 2-3 sentences of market analysis. One turn, no tools, 45 seconds. If it fails, the system continues without it — nothing breaks

The quantitative signal pipeline (`generate-quant-signals.js` + `execute-signals.js`) replaced narrative-driven trading with systematic rules: trend following, momentum, mean reversion, and volatility filters with position sizing based on ATR.

Token consumption dropped ~80%. Reliability went from "fails weekly" to "never fails".

## Rules

1. **Legal investments only** — anything legal in Spain
2. **Real market data** — actual prices and conditions
3. **Full transparency** — all decisions and reasoning public
4. **No private data** — nothing confidential published

## End Conditions

- 📉 Balance reaches €0 (game over)
- 📅 One year passes (January 27, 2027)
- 🏆 Balance reaches €50,000 (10x victory!)

## Architecture

```
makemerich/
├── README.md              # This file (auto-updated)
├── LEDGER.md              # Daily log (reverse chronological)
├── STRATEGY.md            # Investment rules and approach
├── RULES.md               # Hard constraints (position limits, stops)
├── data/                  # Portfolio state, prices, signals, trades
│   ├── portfolio.json     # Current holdings
│   ├── .prices-latest.json
│   ├── .signals-latest.json
│   ├── .quant-signals-latest.json
│   ├── .trade-orders.json
│   └── trades/            # Monthly trade logs
└── scripts/
    ├── fetch-prices.js          # Yahoo Finance + Coinbase
    ├── fetch-history.js         # Historical OHLCV data
    ├── update-portfolio.js      # Recalc at current prices
    ├── validate-rules.js        # Check position limits, stops
    ├── generate-signals.js      # Threshold-based alerts
    ├── generate-quant-signals.js # Technical analysis (SMA, RSI, MACD, ATR)
    ├── execute-signals.js       # Generate binding trade orders
    ├── apply-trades.js          # Apply orders to portfolio.json
    ├── generate-ledger-entry.js # Build LEDGER draft (data only)
    ├── append-ledger.js         # Insert entry at top of LEDGER
    ├── update-readme.js         # Update this file
    └── daily-update.sh          # Orchestrator (cron entry point)
```

## Links

- 📒 [Investment Ledger](LEDGER.md)
- 📋 [Strategy Document](STRATEGY.md)

---

*Last updated: 2026-04-23 by Hustle*
