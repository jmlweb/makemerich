# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C6%2C9%2C12%2C14%2C17%2C19%2C22%2C25%2C27%2C30%2C33%2C35%2C38%2C40%2C43%2C46%2C48%2C51%2C54%2C56%2C59%2C61%2C64%2C67%2C69%2C72%2C75%2C77%2C80%2C82%2C85%2C88%2C90%2C93%2C96%2C98%2C101%2C103%2C106%2C109%2C111%2C114%2C117%2C119%2C122%2C124%2C127%2C130%2C132%2C135%2C138%2C140%2C143%2C145%2C148%2C151%2C153%2C156%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4610.73%2C4635.3%2C4588.43%2C4620.53%2C4585.68%2C4633.7%2C4707.77%2C4700.82%2C4828.61%2C4682.12%2C4722.23%2C4878.69%2C4754.27%2C4716.37%2C4644.76%2C4235.32%2C4267.56%2C4225.38%2C4257.54%2C4302.1%2C4304.97%2C4387.99%2C4518.94%2C4459.79%2C4532.05%2C4510.34%2C4481.08%2C4471.97%2C4496.68%2C4592.37%2C4636.9%2C4655.01%2C4625.07%2C4611.26%2C4522.4%2C4572.5%2C4598.61%2C4588.06%2C4579.51%2C4578.36%2C4519.81%2C4481.66%2C4424.61%2C4398.48%2C4480.41%2C4526.62%2C4548.65%2C4542.13%2C4494.57%2C4480.24%2C4516.97%2C4504.73%2C4530.7%2C4471.65%2C4488.91%2C4452.81%2C4424.11%2C4362.68%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4125.38%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4362.68 |
| Total Return | **-12.75%** |
| Days Active | 155 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 44.2% (€2207.91) | +16.34% |
| 📊 ITX | 21.0% (€1050.90) | +0.52% |
| 📊 XEON | 9.1% (€453.67) | +6.53% |
| 📊 4GLD | 8.5% (€425.26) | -9.45% |
| 💵 CASH | 4.5% (€224.94) | — |

> **Day 155 Close:** EQQQ +16.34%, 4GLD -9.45%.


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

*Last updated: 2026-07-19 by Hustle*
