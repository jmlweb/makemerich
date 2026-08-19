# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C7%2C10%2C14%2C17%2C20%2C23%2C26%2C29%2C33%2C36%2C39%2C42%2C45%2C48%2C51%2C55%2C58%2C61%2C64%2C67%2C70%2C74%2C77%2C80%2C83%2C86%2C89%2C92%2C96%2C99%2C102%2C105%2C108%2C111%2C114%2C118%2C121%2C124%2C127%2C130%2C133%2C137%2C140%2C143%2C146%2C149%2C152%2C155%2C159%2C162%2C165%2C168%2C171%2C174%2C178%2C181%2C184%2C187%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4600.06%2C4666.81%2C4620.53%2C4585.68%2C4534.9%2C4664.71%2C4647.7%2C4646.88%2C4722.23%2C4884.56%2C4709.31%2C4753.81%2C3778.11%2C4267.56%2C4225.38%2C4311.31%2C4313.53%2C4387.99%2C4518.94%2C4459.79%2C4495.88%2C4482.66%2C4471.97%2C4496.68%2C4627.39%2C4625%2C4592.5%2C4617.48%2C4522.4%2C4577.65%2C4614.86%2C4571.98%2C4576.91%2C4519.81%2C4481.66%2C4386.39%2C4480.41%2C4526.62%2C4548.65%2C4542.13%2C4490.97%2C4470.81%2C4504.73%2C4530.7%2C4407.66%2C4488.91%2C4441.25%2C4362.68%2C4445.75%2C4380.27%2C4380.47%2C4366.42%2C4436.73%2C4537.23%2C4562.33%2C4583.41%2C4560.26%2C4517.1%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4517.10 |
| Total Return | **-9.66%** |
| Days Active | 186 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 45.0% (€2249.15) | +18.51% |
| 📊 ITX | 22.6% (€1130.68) | +8.16% |
| 📊 XEON | 9.1% (€454.50) | +6.72% |
| 💵 CASH | 5.1% (€256.38) | — |
| 📊 SIE | 4.5% (€224.85) | -0.32% |
| 📊 AIR | 2.3% (€114.99) | -0.89% |
| 📊 ASML | 1.7% (€86.10) | -0.04% |
| 📊 4GLD | 0.0% (€0.45) | -1.13% |

> **Day 186 Close:** EQQQ +18.51%, 4GLD -1.13%.


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

*Last updated: 2026-08-19 by Hustle*
