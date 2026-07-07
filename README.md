# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C3%2C6%2C8%2C11%2C13%2C16%2C18%2C21%2C23%2C25%2C28%2C30%2C33%2C35%2C38%2C40%2C42%2C45%2C47%2C50%2C52%2C55%2C57%2C60%2C62%2C64%2C67%2C69%2C72%2C74%2C77%2C79%2C82%2C84%2C86%2C89%2C91%2C94%2C96%2C99%2C101%2C104%2C106%2C108%2C111%2C113%2C116%2C118%2C121%2C123%2C125%2C128%2C130%2C133%2C135%2C138%2C140%2C143%2C145%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4975.68%2C4610.73%2C4545.93%2C4631.56%2C4528.99%2C4580.69%2C4593.48%2C4552.4%2C4664.71%2C4700.82%2C4749.02%2C4682.12%2C4722.23%2C4878.69%2C4754.27%2C4716.37%2C4753.81%2C3778.11%2C4274.53%2C4221.71%2C4216.34%2C4311.31%2C4322.76%2C4314.02%2C4427.82%2C4518.94%2C4459.79%2C4532.05%2C4510.34%2C4482.66%2C4471.97%2C4491.29%2C4592.37%2C4593.65%2C4625%2C4592.5%2C4690.18%2C4606.84%2C4522.4%2C4577.65%2C4598.61%2C4564.69%2C4579.51%2C4576.91%2C4519.81%2C4481.66%2C4464.92%2C4386.39%2C4480.41%2C4564.67%2C4533.54%2C4548.65%2C4542.13%2C4490.97%2C4480.24%2C4516.97%2C4504.73%2C4530.7%2C4507.3%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4507.30 |
| Total Return | **-9.85%** |
| Days Active | 144 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 45.5% (€2274.84) | +19.86% |
| 📊 ITX | 22.2% (€1111.91) | +6.36% |
| 📊 XEON | 9.1% (€453.35) | +6.45% |
| 📊 4GLD | 8.8% (€442.27) | -5.83% |
| 💵 CASH | 4.5% (€224.94) | — |

> **Day 144 Close:** EQQQ +19.86%, 4GLD -5.83%.


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

*Last updated: 2026-07-07 by Hustle*
