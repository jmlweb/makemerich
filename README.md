# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C13%2C17%2C21%2C25%2C29%2C34%2C38%2C42%2C46%2C50%2C54%2C58%2C62%2C66%2C70%2C74%2C78%2C82%2C86%2C90%2C95%2C99%2C103%2C107%2C111%2C115%2C119%2C123%2C127%2C131%2C135%2C139%2C143%2C147%2C152%2C156%2C160%2C164%2C168%2C172%2C176%2C180%2C184%2C188%2C192%2C196%2C200%2C204%2C208%2C213%2C217%2C221%2C225%2C229%2C233%2C237%2C241%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4528.99%2C4585.68%2C4552.4%2C4700.82%2C4646.88%2C4745.85%2C4754.27%2C4753.81%2C4235.32%2C4221.71%2C4257.54%2C4313.53%2C4427.82%2C4456.71%2C4495.88%2C4482.66%2C4495%2C4592.37%2C4625%2C4625.07%2C4528.95%2C4577.65%2C4588.06%2C4572.41%2C4519.81%2C4481.66%2C4398.48%2C4564.67%2C4548.65%2C4486.73%2C4480.24%2C4535.72%2C4530.7%2C4493.11%2C4441.25%2C4362.68%2C4370.66%2C4363.86%2C4366.42%2C4513.12%2C4556.64%2C4554.71%2C4560.26%2C4469.5%2C4477.91%2C4545.2%2C4478.63%2C4493.54%2C4423.42%2C4523.06%2C4529.2%2C4527.23%2C4590.74%2C4593.46%2C4566.2%2C4511.28%2C4532.01%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A4121.71%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4532.01 |
| Total Return | **-9.36%** |
| Days Active | 240 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 46.8% (€2338.51) | +23.22% |
| 📊 ITX | 22.1% (€1103.69) | +5.57% |
| 📊 XEON | 9.1% (€456.34) | +7.16% |
| 💵 CASH | 7.1% (€355.53) | — |
| 📊 VWCE | 3.9% (€196.14) | +0.59% |
| 📊 ASML | 1.6% (€81.80) | -5.03% |
| 📊 4GLD | 0.0% (€0.00) | -5.18% |

> **Day 240 Close:** EQQQ +23.22%, 4GLD -5.18%.


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

*Last updated: 2026-10-21 by Hustle*
