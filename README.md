# 💰 MakeMeRich

A public experiment in AI-assisted investing — and in figuring out what AI should actually do vs what it shouldn't.

## 📊 Portfolio Performance

![Balance Chart](https://quickchart.io/chart?c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B1%2C5%2C9%2C13%2C17%2C21%2C25%2C29%2C33%2C37%2C41%2C45%2C49%2C53%2C57%2C60%2C64%2C68%2C72%2C76%2C80%2C84%2C88%2C92%2C96%2C100%2C104%2C108%2C112%2C116%2C120%2C124%2C128%2C132%2C136%2C140%2C144%2C148%2C152%2C156%2C160%2C164%2C168%2C172%2C176%2C179%2C183%2C187%2C191%2C195%2C199%2C203%2C207%2C211%2C215%2C219%2C223%2C227%2C231%2C235%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20%E2%82%AC%22%2C%22data%22%3A%5B5000%2C4596.69%2C4635.3%2C4528.99%2C4585.68%2C4552.4%2C4700.82%2C4646.88%2C4722.23%2C4835.59%2C4704.38%2C3778.11%2C4220.58%2C4277.96%2C4322.76%2C4314.02%2C4518.94%2C4451.46%2C4510.34%2C4446.05%2C4496.68%2C4593.65%2C4655.01%2C4617.48%2C4522.4%2C4546.31%2C4564.69%2C4576.91%2C4513.2%2C4464.92%2C4480.41%2C4526.62%2C4548.65%2C4494.57%2C4480.24%2C4504.73%2C4520.79%2C4488.91%2C4441.25%2C4362.68%2C4370.66%2C4363.86%2C4366.42%2C4513.12%2C4556.64%2C4558.33%2C4560.26%2C4509.33%2C4492.98%2C4506.52%2C4502.05%2C4493.54%2C4485.74%2C4461.92%2C4529.2%2C4525.3%2C4571.32%2C4606.09%2C4593.46%2C4519.63%5D%2C%22borderColor%22%3A%22%2336a2eb%22%2C%22backgroundColor%22%3A%22rgba%2854%2C162%2C235%2C0.2%29%22%2C%22fill%22%3Atrue%7D%5D%7D%2C%22options%22%3A%7B%22scales%22%3A%7B%22yAxes%22%3A%5B%7B%22ticks%22%3A%7B%22min%22%3A3678.11%2C%22max%22%3A5100%7D%7D%5D%7D%7D%7D)

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €4519.63 |
| Total Return | **-9.61%** |
| Days Active | 234 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| 📊 EQQQ | 46.7% (€2336.34) | +23.10% |
| 📊 ITX | 21.8% (€1090.40) | +4.30% |
| 📊 XEON | 9.1% (€456.17) | +7.11% |
| 💵 CASH | 4.5% (€226.23) | — |
| 📊 VWCE | 3.9% (€195.17) | +0.09% |
| 📊 SIE | 2.7% (€135.15) | -1.66% |
| 📊 ASML | 1.6% (€80.18) | -6.91% |
| 📊 4GLD | 0.0% (€0.00) | -4.25% |

> **Day 234 Close:** EQQQ +23.10%, ASML -6.91%.


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

*Last updated: 2026-10-15 by Hustle*
