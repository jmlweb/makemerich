# Agent Instructions

This document provides clear instructions for AI agents operating the MakeMeRich simulation.

## Daily Routine

### When: Every day at 09:00 Europe/Madrid

### Steps:

1. **Check last entry date** in `data/` - ensure no duplicate entries
2. **Fetch market data** for all current positions
3. **Calculate new balance** based on price changes
4. **Analyze market conditions** for tomorrow allocation
5. **Make investment decision** for next day
6. **Update files**:
   - `data/YYYY-MM-DD.json` - Structured data
   - `LEDGER.md` - Human-readable log
   - `LEARNINGS.md` - If there is something to learn (mistake, win, pattern)
   - `STRATEGY.md` - If strategy changes
7. **Commit and push** with descriptive message

## File Formats

### data/YYYY-MM-DD.json

```json
{
  "date": "2026-01-28",
  "day": 2,
  "balance": {
    "total": 5127.50,
    "currency": "EUR"
  },
  "change": {
    "absolute": 127.50,
    "percentage": 2.55
  },
  "positions": [
    {
      "asset": "CSPX",
      "type": "ETF",
      "units": 12.5,
      "avgPrice": 140.00,
      "currentPrice": 142.80,
      "value": 1785.00,
      "pnl": 35.00,
      "pnlPercent": 2.0
    }
  ],
  "allocation": {
    "CSPX": 1785.00,
    "EQQQ": 1275.00,
    "BTC": 1020.00,
    "ETH": 510.00,
    "cash": 537.50
  },
  "trades": [
    {
      "action": "BUY",
      "asset": "CSPX",
      "units": 12.5,
      "price": 140.00,
      "total": 1750.00,
      "fee": 1.75
    }
  ],
  "marketConditions": {
    "sp500": {"value": 6980.00, "change": "+0.43%"},
    "nasdaq": {"value": 18500.00, "change": "+0.65%"},
    "bitcoin": {"value": 89500, "currency": "USD", "change": "+1.2%"}
  },
  "nextDayPlan": {
    "action": "HOLD",
    "changes": [],
    "reasoning": "Maintaining current allocation, markets stable"
  },
  "metadata": {
    "generatedAt": "2026-01-28T19:00:00Z",
    "dataSources": ["Yahoo Finance", "CoinGecko"],
    "agentVersion": "HAL-1.0"
  }
}
```

## Data Sources

### Price Data (Priority Order)

1. **Stocks/ETFs**: Yahoo Finance, Google Finance, Investing.com
2. **Crypto**: CoinGecko, CoinMarketCap, Binance
3. **Forex**: XE.com, OANDA
4. **Commodities**: Investing.com, TradingView
5. **Alternative**: Platform-specific (Mintos, Urbanitae, etc.)

### Market Analysis

- **News**: Reuters, Bloomberg, CNBC
- **Technical**: TradingView, Investing.com
- **Sentiment**: Fear and Greed Index, social sentiment

## Decision Framework

### Before Each Trade, Consider:

1. **Market Trend** - Bull/bear/sideways?
2. **Position Size** - Within limits?
3. **Risk/Reward** - Is the upside worth the downside?
4. **Correlation** - How does this affect portfolio diversity?
5. **Timing** - Any upcoming events (earnings, Fed, etc.)?

### Decision Types

- `BUY` - Open new position or add to existing
- `SELL` - Close or reduce position
- `HOLD` - Maintain current allocation
- `REBALANCE` - Adjust allocations without changing strategy

## Error Handling

### If market data unavailable:
- Use last known price with note
- Skip volatile decisions until data available

### If calculation error:
- Log the error in metadata
- Use conservative estimate
- Flag for human review

### If duplicate entry detected:
- **DO NOT create new entry**
- Log warning and skip

## Commit Message Format

```
feat: Day X - [Summary]

- Balance: X,XXX.XX EUR (+/-X.XX%)
- Key trades: [list]
- Market: [brief condition]
```

## Alerts

Notify the user when:
- Position hits stop-loss (-20%)
- Portfolio up 10%+ from start
- Portfolio down 10%+ from start
- Take-profit triggered
- Balance below 1,000 EUR

## Available Assets

See [ASSETS.md](ASSETS.md) for the complete list of available investment options with tickers, risk levels, and notes.

When considering new positions, always check ASSETS.md first for approved options.

## Updating README.md

**IMPORTANT:** After each daily entry, update the "Quick Stats" and "Current Status" sections in README.md:

### Quick Stats to Update:
```markdown
| Metric | Value |
|--------|-------|
| Starting Capital | 5,000 EUR |
| Current Balance | [from latest data/YYYY-MM-DD.json] |
| Total Return | [calculated %] |
| Days Active | [day number] |
| Best Day | [highest single-day gain] |
| Worst Day | [lowest single-day loss] |
```

### Current Status to Update:
- Update "Day X" number
- Update balance if significantly different
- Update allocation percentages if changed

### How to Calculate:
- **Total Return**: `((current_balance - 5000) / 5000) * 100`
- **Days Active**: `day` field from latest JSON
- **Best/Worst Day**: Track from `change.percentage` across all JSONs

## File Reference

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `data/YYYY-MM-DD.json` | Daily structured data | Daily |
| `LEDGER.md` | Human-readable log | Daily |
| `README.md` | Project overview + stats | Daily (Quick Stats) |
| `ASSETS.md` | Available investments | When new assets added |
| `STRATEGY.md` | Investment approach | When strategy changes |
| `LEARNINGS.md` | Lessons learned | When something notable happens |
| `RULES.md` | Game rules | Rarely (if ever) |
