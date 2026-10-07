# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C12%2C16%2C20%2C24%2C28%2C32%2C35%2C39%2C43%2C47%2C51%2C55%2C58%2C62%2C66%2C70%2C74%2C78%2C81%2C85%2C89%2C93%2C97%2C101%2C104%2C108%2C112%2C116%2C120%2C124%2C127%2C131%2C135%2C139%2C143%2C147%2C150%2C154%2C158%2C162%2C166%2C170%2C173%2C177%2C181%2C185%2C189%2C193%2C196%2C200%2C204%2C208%2C212%2C216%2C219%2C223%2C227%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4588.43%2C4580.69%2C4534.9%2C4593.74%2C4749.02%2C4730.38%2C4878.69%2C4709.31%2C4644.76%2C4274.53%2C4225.38%2C4311.31%2C4313.53%2C4427.82%2C4456.71%2C4495.88%2C4482.66%2C4495%2C4547.56%2C4636.9%2C4592.5%2C4611.26%2C4574.64%2C4598.61%2C4564.69%2C4576.91%2C4513.2%2C4464.92%2C4480.41%2C4526.62%2C4548.65%2C4486.73%2C4480.24%2C4535.72%2C4530.7%2C4493.11%2C4464%2C4362.68%2C4427.65%2C4380.27%2C4342.71%2C4366.42%2C4545.82%2C4556.64%2C4583.41%2C4551.16%2C4492.98%2C4490.98%2C4545.2%2C4478.63%2C4493.54%2C4423.42%2C4525.13%2C4529.2%2C4525.3%2C4571.32%2C4626.67%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4125.38%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4626.67 |
| Total Return | **-7.47%** |
| Days Active | 226 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 49.2% (€2457.90) | +29.51% |
| 📊 ITX | 21.2% (€1060.67) | +1.46% |
| 📊 XEON | 9.1% (€455.92) | +7.06% |
| 💵 CASH | 4.5% (€226.23) | — |
| 📊 VWCE | 4.0% (€199.01) | +2.06% |
| 📊 SIE | 2.8% (€138.10) | +0.50% |
| 📊 ASML | 1.8% (€88.84) | +3.14% |
| 📊 4GLD | 0.0% (€0.00) | -4.99% |

> **Day 226 Close:** EQQQ +29.51%, 4GLD -4.99%.


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

*Last updated: 2026-10-07 by Hustle*
