# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C8%2C12%2C16%2C19%2C23%2C27%2C30%2C34%2C37%2C41%2C45%2C48%2C52%2C56%2C59%2C63%2C67%2C70%2C74%2C78%2C81%2C85%2C88%2C92%2C96%2C99%2C103%2C107%2C110%2C114%2C118%2C121%2C125%2C129%2C132%2C136%2C139%2C143%2C147%2C150%2C154%2C158%2C161%2C165%2C169%2C172%2C176%2C180%2C183%2C187%2C190%2C194%2C198%2C201%2C205%2C209%2C212%2C216%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4545.93%2C4588.43%2C4580.69%2C4633.7%2C4664.71%2C4828.61%2C4682.12%2C4745.85%2C4835.59%2C4704.38%2C3778.11%2C4267.56%2C4216.34%2C4302.1%2C4304.97%2C4446.11%2C4459.79%2C4495.88%2C4482.66%2C4495%2C4547.56%2C4636.9%2C4655.01%2C4617.48%2C4522.4%2C4577.65%2C4588.06%2C4572.41%2C4542.96%2C4481.66%2C4386.39%2C4480.41%2C4533.54%2C4548.65%2C4494.57%2C4480.24%2C4535.72%2C4530.7%2C4493.11%2C4464%2C4362.68%2C4427.65%2C4380.27%2C4380.47%2C4366.42%2C4513.12%2C4556.64%2C4554.71%2C4560.26%2C4509.33%2C4492.98%2C4494.97%2C4545.2%2C4447.08%2C4493.54%2C4404.99%2C4525.13%2C4529.2%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4529.20 |
| Total Return | **-9.42%** |
| Days Active | 215 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 47.4% (€2368.18) | +24.78% |
| 📊 ITX | 20.8% (€1041.51) | -0.37% |
| 📊 XEON | 9.1% (€455.65) | +6.99% |
| 💵 CASH | 4.4% (€220.87) | — |
| 📊 TTE | 4.4% (€217.52) | +1.91% |
| 📊 AIR | 2.8% (€141.07) | -1.02% |
| 📊 ASML | 1.7% (€84.39) | -2.02% |
| 📊 4GLD | 0.0% (€0.01) | -2.97% |

> **Day 215 Close:** EQQQ +24.78%, 4GLD -2.97%.


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

*Last updated: 2026-09-26 by Hustle*
