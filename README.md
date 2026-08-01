# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C7%2C10%2C12%2C15%2C18%2C21%2C24%2C27%2C29%2C32%2C35%2C38%2C41%2C44%2C47%2C49%2C52%2C55%2C58%2C61%2C64%2C66%2C69%2C72%2C75%2C78%2C81%2C84%2C86%2C89%2C92%2C95%2C98%2C101%2C104%2C106%2C109%2C112%2C115%2C118%2C121%2C123%2C126%2C129%2C132%2C135%2C138%2C141%2C143%2C146%2C149%2C152%2C155%2C158%2C160%2C163%2C166%2C169%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4600.06%2C4666.81%2C4588.43%2C4583.51%2C4593.48%2C4552.4%2C4593.74%2C4828.61%2C4646.88%2C4730.38%2C4878.69%2C4754.27%2C4704.38%2C3768.05%2C4274.53%2C4220.58%2C4216.34%2C4311.31%2C4313.53%2C4387.99%2C4518.94%2C4456.71%2C4532.05%2C4510.34%2C4481.08%2C4495%2C4547.56%2C4593.65%2C4625%2C4592.5%2C4617.48%2C4528.95%2C4572.5%2C4598.61%2C4564.69%2C4579.51%2C4578.36%2C4513.2%2C4481.66%2C4386.39%2C4480.41%2C4564.67%2C4559.16%2C4548.65%2C4494.57%2C4480.24%2C4516.97%2C4530.7%2C4530.7%2C4407.66%2C4488.91%2C4441.25%2C4362.68%2C4427.65%2C4370.66%2C4380.27%2C4342.71%2C4366.42%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4366.42 |
| Total Return | **-12.67%** |
| Days Active | 168 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 43.2% (€2157.99) | +13.71% |
| 📊 ITX | 22.1% (€1103.69) | +5.57% |
| 📊 XEON | 9.1% (€454.01) | +6.61% |
| 📊 4GLD | 8.5% (€425.79) | -9.34% |
| 💵 CASH | 4.5% (€224.94) | — |

> **Day 168 Close:** EQQQ +13.71%, 4GLD -9.34%.


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

*Last updated: 2026-08-01 by Hustle*
