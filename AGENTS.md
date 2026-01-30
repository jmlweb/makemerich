# Agent Instructions

> **For HAL:** See [HAL.md](HAL.md) for detailed workflow.

## Quick Reference

| File | Purpose | Update |
|------|---------|--------|
| [HAL.md](HAL.md) | My workflow & schedule | When process changes |
| [LEDGER.md](LEDGER.md) | Daily log (human-readable) | Daily 21:30 |
| [STRATEGY.md](STRATEGY.md) | Investment approach | When strategy changes |
| [LEARNINGS.md](LEARNINGS.md) | Lessons learned | When notable events |
| [RULES.md](RULES.md) | Game rules (fixed) | Never |
| [ASSETS.md](ASSETS.md) | Available investments | When adding new options |
| [README.md](README.md) | Public overview + chart | Daily |
| `data/portfolio.json` | Current state | Every check |
| `data/trades/YYYY-MM.json` | Transaction log | On trades |
| `data/summary.json` | Monthly totals | End of day |

## Alerts

Notify user when:
- Position hits stop-loss (-15%)
- Portfolio down 10%+ from start
- Portfolio up 20%+ from start
- Balance below €1,000

## Data Sources

- **ETFs:** Yahoo Finance, stockanalysis.com
- **Crypto:** Coinbase API, CoinGecko
- **News:** Reuters, CNBC
- **Sentiment:** Fear & Greed Index
