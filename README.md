# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C13%2C17%2C20%2C24%2C28%2C32%2C36%2C40%2C44%2C48%2C51%2C55%2C59%2C63%2C67%2C71%2C75%2C79%2C83%2C86%2C90%2C94%2C98%2C102%2C106%2C110%2C114%2C117%2C121%2C125%2C129%2C133%2C137%2C141%2C145%2C148%2C152%2C156%2C160%2C164%2C168%2C172%2C176%2C180%2C183%2C187%2C191%2C195%2C199%2C203%2C207%2C211%2C214%2C218%2C222%2C226%2C230%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4528.99%2C4585.68%2C4534.9%2C4593.74%2C4749.02%2C4730.38%2C4884.56%2C4716.37%2C3768.05%2C4267.56%2C4225.38%2C4311.31%2C4304.97%2C4446.11%2C4459.79%2C4513.47%2C4481.08%2C4491.29%2C4627.39%2C4625%2C4625.07%2C4606.84%2C4572.5%2C4614.86%2C4579.51%2C4542.96%2C4481.66%2C4424.61%2C4480.41%2C4533.54%2C4548.65%2C4490.97%2C4470.81%2C4530.7%2C4471.65%2C4488.91%2C4441.25%2C4362.68%2C4370.66%2C4363.86%2C4366.42%2C4513.12%2C4556.64%2C4554.71%2C4560.26%2C4509.33%2C4492.98%2C4506.52%2C4502.05%2C4493.54%2C4485.74%2C4461.92%2C4509.74%2C4514.75%2C4571.32%2C4624.74%2C4593.46%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4593.46 |
| Total Return | **-8.13%** |
| Days Active | 229 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 48.7% (€2433.30) | +28.21% |
| 📊 ITX | 21.1% (€1053.24) | +0.75% |
| 📊 XEON | 9.1% (€456.08) | +7.09% |
| 💵 CASH | 4.5% (€226.23) | — |
| 📊 VWCE | 4.0% (€198.32) | +1.71% |
| 📊 SIE | 2.8% (€137.52) | +0.07% |
| 📊 ASML | 1.8% (€88.77) | +3.06% |
| 📊 4GLD | 0.0% (€0.00) | -3.40% |

> **Day 229 Close:** EQQQ +28.21%, 4GLD -3.40%.


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

*Last updated: 2026-10-10 by Hustle*
