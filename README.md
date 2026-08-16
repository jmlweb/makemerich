# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C7%2C10%2C13%2C17%2C20%2C23%2C26%2C29%2C32%2C35%2C38%2C41%2C44%2C48%2C51%2C54%2C57%2C60%2C63%2C66%2C69%2C72%2C75%2C79%2C82%2C85%2C88%2C91%2C94%2C97%2C100%2C103%2C106%2C110%2C113%2C116%2C119%2C122%2C125%2C128%2C131%2C134%2C137%2C141%2C144%2C147%2C150%2C153%2C156%2C159%2C162%2C165%2C168%2C172%2C175%2C178%2C181%2C184%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4600.06%2C4666.81%2C4528.99%2C4585.68%2C4534.9%2C4664.71%2C4647.7%2C4646.88%2C4730.38%2C4878.69%2C4754.27%2C4704.38%2C3768.05%2C4267.56%2C4225.38%2C4257.54%2C4322.76%2C4314.02%2C4446.11%2C4456.71%2C4532.05%2C4510.34%2C4481.08%2C4491.29%2C4592.37%2C4636.9%2C4655.01%2C4690.18%2C4606.84%2C4574.64%2C4546.31%2C4588.06%2C4579.51%2C4542.96%2C4481.66%2C4464.92%2C4398.48%2C4480.41%2C4533.54%2C4548.65%2C4486.73%2C4480.24%2C4470.81%2C4530.7%2C4520.79%2C4493.11%2C4464%2C4424.11%2C4362.68%2C4445.75%2C4380.27%2C4380.47%2C4366.42%2C4513.12%2C4556.64%2C4562.33%2C4583.41%2C4560.26%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4560.26 |
| Total Return | **-8.79%** |
| Days Active | 183 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 45.7% (€2287.14) | +20.51% |
| 📊 ITX | 22.5% (€1126.38) | +7.74% |
| 📊 XEON | 9.1% (€454.43) | +6.71% |
| 💵 CASH | 5.1% (€256.38) | — |
| 📊 SIE | 4.6% (€230.32) | +2.10% |
| 📊 AIR | 2.4% (€117.61) | +1.36% |
| 📊 ASML | 1.8% (€87.55) | +1.65% |
| 📊 4GLD | 0.0% (€0.45) | -2.19% |

> **Day 183 Close:** EQQQ +20.51%, 4GLD -2.19%.


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

*Last updated: 2026-08-16 by Hustle*
