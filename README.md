# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C8%2C12%2C15%2C19%2C22%2C26%2C29%2C33%2C36%2C40%2C44%2C47%2C51%2C54%2C58%2C61%2C65%2C68%2C72%2C75%2C79%2C82%2C86%2C90%2C93%2C97%2C100%2C104%2C107%2C111%2C114%2C118%2C121%2C125%2C129%2C132%2C136%2C139%2C143%2C146%2C150%2C153%2C157%2C160%2C164%2C167%2C171%2C175%2C178%2C182%2C185%2C189%2C192%2C196%2C199%2C203%2C206%2C210%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4545.93%2C4588.43%2C4583.51%2C4633.7%2C4707.77%2C4647.7%2C4646.88%2C4722.23%2C4884.56%2C4716.37%2C3768.05%2C4274.53%2C4225.38%2C4257.54%2C4313.53%2C4387.99%2C4506.51%2C4451.46%2C4510.34%2C4481.08%2C4491.29%2C4592.37%2C4625%2C4625.07%2C4611.26%2C4574.64%2C4546.31%2C4564.69%2C4572.41%2C4519.81%2C4481.66%2C4386.39%2C4480.41%2C4533.54%2C4548.65%2C4494.57%2C4480.24%2C4535.72%2C4530.7%2C4407.66%2C4464%2C4424.11%2C4385.32%2C4370.66%2C4363.86%2C4379.46%2C4436.73%2C4556.64%2C4562.33%2C4560.26%2C4551.16%2C4492.98%2C4477.91%2C4545.2%2C4502.05%2C4493.54%2C4501.48%2C4404.99%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4404.99 |
| Total Return | **-11.90%** |
| Days Active | 209 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 44.5% (€2222.74) | +17.12% |
| 📊 ITX | 21.3% (€1067.32) | +2.10% |
| 📊 XEON | 9.1% (€455.14) | +6.87% |
| 💵 CASH | 8.7% (€434.52) | — |
| 📊 AIR | 2.9% (€143.55) | +0.72% |
| 📊 ASML | 1.6% (€81.71) | -5.14% |
| 📊 4GLD | 0.0% (€0.01) | -2.96% |

> **Day 209 Close:** EQQQ +17.12%, ASML -5.14%.


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

*Last updated: 2026-09-11 by Hustle*
