# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C13%2C17%2C21%2C25%2C29%2C33%2C37%2C40%2C44%2C48%2C52%2C56%2C60%2C64%2C68%2C72%2C76%2C80%2C84%2C88%2C92%2C96%2C100%2C104%2C108%2C112%2C116%2C119%2C123%2C127%2C131%2C135%2C139%2C143%2C147%2C151%2C155%2C159%2C163%2C167%2C171%2C175%2C179%2C183%2C187%2C191%2C195%2C198%2C202%2C206%2C210%2C214%2C218%2C222%2C226%2C230%2C234%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4528.99%2C4585.68%2C4552.4%2C4700.82%2C4646.88%2C4722.23%2C4835.59%2C4716.37%2C3768.05%2C4267.56%2C4216.34%2C4302.1%2C4314.02%2C4518.94%2C4451.46%2C4510.34%2C4446.05%2C4496.68%2C4593.65%2C4655.01%2C4617.48%2C4522.4%2C4546.31%2C4564.69%2C4576.91%2C4513.2%2C4464.92%2C4398.48%2C4564.67%2C4548.65%2C4486.73%2C4480.24%2C4535.72%2C4530.7%2C4493.11%2C4452.81%2C4362.68%2C4445.75%2C4380.27%2C4379.46%2C4436.73%2C4556.64%2C4558.33%2C4560.26%2C4509.33%2C4492.98%2C4506.52%2C4545.2%2C4477.98%2C4501.48%2C4419.99%2C4509.74%2C4514.75%2C4571.32%2C4624.74%2C4593.46%2C4566.2%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3668.05%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4566.20 |
| Total Return | **-8.68%** |
| Days Active | 233 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 48.1% (€2404.72) | +26.71% |
| 📊 ITX | 21.2% (€1058.72) | +1.27% |
| 📊 XEON | 9.1% (€456.11) | +7.10% |
| 💵 CASH | 4.5% (€226.23) | — |
| 📊 VWCE | 4.0% (€198.02) | +1.55% |
| 📊 SIE | 2.8% (€138.73) | +0.96% |
| 📊 ASML | 1.7% (€83.67) | -2.86% |
| 📊 4GLD | 0.0% (€0.00) | -4.00% |

> **Day 233 Close:** EQQQ +26.71%, 4GLD -4.00%.


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

*Last updated: 2026-10-14 by Hustle*
