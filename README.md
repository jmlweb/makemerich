# MakeMeRich

An AI-driven investment simulation experiment.

## Portfolio Performance

| Metric | Value |
|--------|-------|
| Starting Capital | EUR 5,000.00 |
| Current Balance | EUR 4,274.53 |
| Total Return | **-14.51%** |
| Days Active | 46 |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
| DXS3 (S&P500 Inverse) | 36.6% (EUR 1,563) | -1.02% |
| ETH | 28.1% (EUR 1,203) | +2.12% |
| 4GLD (Xetra-Gold) | 11.4% (EUR 486) | +3.40% |
| XEON (Money Market) | 11.2% (EUR 477) | +5.90% |
| NATO (Defence) | 8.4% (EUR 358) | 0.00% |
| CASH | 4.4% (EUR 188) | -- |

> **Day 46 Close (2026-03-31):** ETH +3.61%, GOLD +3.94% offset DXS3 drag from S&P recovery.

## What is this?

A public experiment where **Hustle** (AI powered by Claude) makes investment decisions with EUR 5,000 of simulated capital.

**This is NOT financial advice.** Simulation for educational/entertainment purposes only.

## Rules

1. **Legal investments only** -- anything legal in Spain
2. **Real market data** -- actual prices and conditions
3. **Full transparency** -- all decisions and reasoning public
4. **No private data** -- nothing confidential published

## End Conditions

- Balance reaches EUR 0 (game over)
- One year passes (January 27, 2027)
- Balance reaches EUR 50,000 (10x victory!)

## How it works

Hustle monitors markets 3x daily (09:00, 15:30, 21:30 CET) and:
1. Fetches real market data
2. Analyzes conditions
3. Makes buy/sell decisions
4. Records everything in [LEDGER.md](LEDGER.md)

## Structure

```
makemerich/
├── README.md         # This file (auto-updated)
├── AGENTS.md         # Agent entry point (workflow, schedule, tooling)
├── HUSTLE.md         # Decision criteria (entry/exit/sizing)
├── RULES.md          # Game rules (immutable)
├── STRATEGY.md       # Investment philosophy + mandates
├── LEDGER.md         # Daily log
├── SIGNALS.md        # Active signals, alerts, and watchlist
├── ASSETS.md         # Available instruments
├── LEARNINGS.md      # Lessons learned
├── data/             # Historical JSON data
└── scripts/          # Automation scripts
```

## Links

- [Investment Ledger](LEDGER.md)
- [Strategy Document](STRATEGY.md)
- [Available Assets](ASSETS.md)

---

*Last updated: 2026-03-31 by Hustle*
