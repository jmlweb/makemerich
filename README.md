# MakeMeRich

An AI-driven investment simulation experiment.

## What is this?

This is a public experiment where an AI (HAL, powered by Claude) makes daily virtual investment decisions starting with **5,000 EUR** of simulated capital.

**This is NOT financial advice.** This is a simulation for educational and entertainment purposes only.

## Rules

1. **One entry per day** - No more, no less
2. **Legal investments only** - All simulated investments must be legal in Spain
3. **Real market data** - Decisions based on actual market prices and conditions
4. **Full transparency** - All decisions and reasoning are public
5. **No private data** - Nothing confidential is ever published

See [RULES.md](RULES.md) for complete rules and constraints.

## Investment Universe

This is **not** limited to stocks and crypto. Any legal investment in Spain is fair game:

### Traditional
Stocks - ETFs - Bonds - REITs/SOCIMIs - Mutual Funds

### Digital
Crypto (BTC, ETH, altcoins) - Stablecoins - DeFi yields

### Alternative
P2P Lending - Real Estate Crowdfunding - Equity Crowdfunding - Art Fractions

### Fixed Income
Letras del Tesoro - Bank Deposits - Money Market Funds

### Speculative
Sports Betting (licensed) - Forex - Options - Commodities

### Tangible (Simulated)
Wine - Watches - Classic Cars - Collectibles

## End Conditions

The simulation ends when **either**:
- Balance reaches 0 EUR (game over)
- One year passes (January 27, 2027)
- Balance reaches 50,000 EUR (10x victory!)

## How it works

Each day at 20:00 (Madrid time), HAL:
1. Fetches real market data for all positions
2. Calculates the new portfolio balance
3. Analyzes market conditions
4. Makes investment decisions for the next day
5. Records everything in the ledger
6. Commits and pushes to this repo

## Structure

```
makemerich/
  README.md           # This file
  RULES.md            # Complete rules and constraints
  STRATEGY.md         # Current investment approach
  LEARNINGS.md        # Lessons, mistakes, and wins
  AGENTS.md           # Instructions for AI agents
  LEDGER.md           # Human-readable daily log
  data/
    YYYY-MM-DD.json   # Structured daily data
  scripts/
    calculate-balance.js  # Portfolio calculator
    generate-entry.js     # Entry generator
```

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Start | January 27, 2026 | Done |
| End (max) | January 27, 2027 | Pending |

## Starting Capital

**5,000.00 EUR**

## Current Status

**Day 1** - Initial allocation deployed

### Current Allocation
- 35% Index ETFs (CSPX)
- 25% Tech ETFs (EQQQ)
- 20% Bitcoin
- 10% Ethereum
- 10% Cash

## For AI Agents

If you are an AI agent operating this simulation, see [AGENTS.md](AGENTS.md) for detailed instructions.

## Quick Stats

| Metric | Value |
|--------|-------|
| Starting Capital | 5,000 EUR |
| Current Balance | 5,000 EUR |
| Total Return | 0.00% |
| Days Active | 1 |
| Best Day | - |
| Worst Day | - |

---

*Experiment by [@jmlweb](https://github.com/jmlweb) and HAL*
