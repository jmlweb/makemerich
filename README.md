# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C8%2C11%2C14%2C17%2C21%2C24%2C27%2C30%2C34%2C37%2C40%2C43%2C47%2C50%2C53%2C56%2C60%2C63%2C66%2C69%2C73%2C76%2C79%2C82%2C86%2C89%2C92%2C95%2C99%2C102%2C105%2C108%2C112%2C115%2C118%2C121%2C125%2C128%2C131%2C134%2C138%2C141%2C144%2C147%2C151%2C154%2C157%2C160%2C164%2C167%2C170%2C173%2C177%2C180%2C183%2C186%2C190%2C193%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4545.93%2C4631.56%2C4620.53%2C4585.68%2C4552.4%2C4593.74%2C4828.61%2C4682.12%2C4745.85%2C4835.59%2C4716.37%2C4644.76%2C4274.53%2C4221.71%2C4277.96%2C4302.1%2C4314.02%2C4446.11%2C4456.71%2C4532.05%2C4519.39%2C4446.05%2C4491.29%2C4592.37%2C4625%2C4592.5%2C4617.48%2C4528.95%2C4577.65%2C4614.86%2C4571.98%2C4576.91%2C4513.2%2C4481.66%2C4386.39%2C4480.41%2C4533.54%2C4548.65%2C4486.73%2C4480.24%2C4516.97%2C4530.7%2C4520.79%2C4493.11%2C4452.81%2C4362.68%2C4385.32%2C4370.66%2C4363.86%2C4379.46%2C4366.42%2C4545.82%2C4556.64%2C4554.71%2C4560.26%2C4503.59%2C4492.98%2C4505.63%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4121.71%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4505.63 |
| Total Return | **-9.89%** |
| Days Active | 192 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 44.4% (€2218.76) | +16.91% |
| 📊 ITX | 22.9% (€1147.11) | +9.73% |
| 📊 XEON | 9.1% (€454.63) | +6.75% |
| 💵 CASH | 5.1% (€256.38) | — |
| 📊 SIE | 4.6% (€231.91) | +2.80% |
| 📊 AIR | 2.2% (€112.48) | -3.06% |
| 📊 ASML | 1.7% (€83.89) | -2.60% |
| 📊 4GLD | 0.0% (€0.47) | +2.56% |

> **Day 192 Close:** EQQQ +16.91%, AIR -3.06%.


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

*Last updated: 2026-08-25 by Hustle*
