# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C4%2C8%2C11%2C15%2C18%2C22%2C25%2C29%2C32%2C36%2C39%2C43%2C46%2C50%2C53%2C57%2C60%2C64%2C67%2C70%2C74%2C77%2C81%2C84%2C88%2C91%2C95%2C98%2C102%2C105%2C109%2C112%2C116%2C119%2C123%2C126%2C130%2C133%2C137%2C140%2C143%2C147%2C150%2C154%2C157%2C161%2C164%2C168%2C171%2C175%2C178%2C182%2C185%2C189%2C192%2C196%2C199%2C203%2C206%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4958.2%2C4545.93%2C4631.56%2C4583.51%2C4593.48%2C4707.77%2C4700.82%2C4646.88%2C4730.38%2C4884.56%2C4709.31%2C4644.76%2C4235.32%2C4221.71%2C4277.96%2C4322.76%2C4314.02%2C4518.94%2C4459.79%2C4495.88%2C4482.66%2C4471.97%2C4547.56%2C4593.65%2C4655.01%2C4690.18%2C4528.95%2C4572.5%2C4614.86%2C4571.98%2C4578.36%2C4513.2%2C4464.92%2C4398.48%2C4564.67%2C4559.16%2C4542.13%2C4490.97%2C4470.81%2C4504.73%2C4530.7%2C4493.11%2C4464%2C4362.68%2C4385.32%2C4380.27%2C4363.86%2C4366.42%2C4436.73%2C4556.64%2C4562.33%2C4560.26%2C4551.16%2C4492.98%2C4477.91%2C4545.2%2C4502.05%2C4493.54%2C4493.54%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4121.71%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4493.54 |
| Total Return | **-10.13%** |
| Days Active | 205 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 44.9% (€2243.00) | +18.19% |
| 📊 ITX | 22.5% (€1123.25) | +7.44% |
| 📊 XEON | 9.1% (€455.00) | +6.84% |
| 💵 CASH | 4.5% (€223.95) | — |
| 📊 SIE | 4.4% (€221.12) | -1.98% |
| 📊 AIR | 2.9% (€145.88) | +2.36% |
| 📊 ASML | 1.6% (€81.33) | -5.57% |
| 📊 4GLD | 0.0% (€0.01) | -1.36% |

> **Day 205 Close:** EQQQ +18.19%, ASML -5.57%.


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

*Last updated: 2026-09-07 by Hustle*
