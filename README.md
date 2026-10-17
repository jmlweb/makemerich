# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C13%2C17%2C21%2C25%2C29%2C33%2C37%2C41%2C45%2C49%2C53%2C57%2C61%2C65%2C69%2C73%2C77%2C81%2C85%2C89%2C93%2C97%2C101%2C105%2C109%2C113%2C117%2C121%2C125%2C129%2C133%2C137%2C141%2C145%2C149%2C153%2C157%2C161%2C165%2C169%2C173%2C177%2C181%2C185%2C189%2C193%2C197%2C201%2C205%2C209%2C213%2C217%2C221%2C225%2C229%2C233%2C237%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4528.99%2C4585.68%2C4552.4%2C4700.82%2C4646.88%2C4722.23%2C4835.59%2C4704.38%2C3778.11%2C4220.58%2C4277.96%2C4322.76%2C4387.99%2C4506.51%2C4532.05%2C4519.39%2C4471.97%2C4547.56%2C4636.9%2C4592.5%2C4611.26%2C4574.64%2C4598.61%2C4571.98%2C4578.36%2C4481.66%2C4424.61%2C4480.41%2C4533.54%2C4548.65%2C4490.97%2C4470.81%2C4530.7%2C4471.65%2C4488.91%2C4424.11%2C4385.32%2C4380.27%2C4380.47%2C4366.42%2C4545.82%2C4556.64%2C4583.41%2C4551.16%2C4492.98%2C4490.98%2C4545.2%2C4447.08%2C4493.54%2C4404.99%2C4523.06%2C4529.2%2C4527.23%2C4590.74%2C4593.46%2C4566.2%2C4511.28%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4511.28 |
| Total Return | **-9.77%** |
| Days Active | 236 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 46.4% (€2322.23) | +22.36% |
| 📊 ITX | 21.8% (€1092.35) | +4.49% |
| 📊 XEON | 9.1% (€456.26) | +7.14% |
| 💵 CASH | 4.5% (€226.23) | — |
| 📊 VWCE | 3.9% (€195.54) | +0.28% |
| 📊 SIE | 2.7% (€136.79) | -0.46% |
| 📊 ASML | 1.6% (€81.87) | -4.94% |
| 📊 4GLD | 0.0% (€0.00) | -4.12% |

> **Day 236 Close:** EQQQ +22.36%, ASML -4.94%.


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

*Last updated: 2026-10-17 by Hustle*
