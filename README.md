# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C8%2C12%2C16%2C19%2C23%2C27%2C31%2C34%2C38%2C42%2C45%2C49%2C53%2C56%2C60%2C64%2C68%2C71%2C75%2C79%2C82%2C86%2C90%2C93%2C97%2C101%2C104%2C108%2C112%2C116%2C119%2C123%2C127%2C130%2C134%2C138%2C141%2C145%2C149%2C152%2C156%2C160%2C164%2C167%2C171%2C175%2C178%2C182%2C186%2C189%2C193%2C197%2C201%2C204%2C208%2C212%2C215%2C219%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4545.93%2C4588.43%2C4580.69%2C4633.7%2C4664.71%2C4828.61%2C4737.81%2C4745.85%2C4754.27%2C4753.81%2C3778.11%2C4220.58%2C4277.96%2C4302.1%2C4314.02%2C4518.94%2C4451.46%2C4513.47%2C4481.08%2C4491.29%2C4592.37%2C4625%2C4625.07%2C4611.26%2C4574.64%2C4598.61%2C4564.69%2C4576.91%2C4513.2%2C4464.92%2C4398.48%2C4564.67%2C4548.65%2C4542.13%2C4480.24%2C4516.97%2C4530.7%2C4471.65%2C4488.91%2C4441.25%2C4362.68%2C4370.66%2C4363.86%2C4379.46%2C4436.73%2C4556.64%2C4562.33%2C4560.26%2C4503.59%2C4492.98%2C4490.98%2C4545.2%2C4447.08%2C4493.54%2C4423.42%2C4525.13%2C4529.2%2C4514.75%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4514.75 |
| Total Return | **-9.71%** |
| Days Active | 218 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 47.0% (€2350.81) | +23.87% |
| 📊 ITX | 20.9% (€1043.07) | -0.22% |
| 📊 XEON | 9.1% (€455.67) | +7.00% |
| 💵 CASH | 4.4% (€220.87) | — |
| 📊 TTE | 4.4% (€217.55) | +1.92% |
| 📊 AIR | 2.8% (€141.58) | -0.66% |
| 📊 ASML | 1.7% (€85.19) | -1.09% |
| 📊 4GLD | 0.0% (€0.01) | -6.37% |

> **Day 218 Close:** EQQQ +23.87%, 4GLD -6.37%.


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

*Last updated: 2026-09-29 by Hustle*
