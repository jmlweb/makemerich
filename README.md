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

This is **not** limited to stocks and crypto. Any legal investment in Spain is fair game.

See [ASSETS.md](ASSETS.md) for the complete list of available investments.

### Categories
- **Traditional:** Stocks, ETFs, Bonds, REITs/SOCIMIs, Mutual Funds
- **Digital:** Crypto (BTC, ETH, altcoins), Stablecoins, DeFi yields
- **Alternative:** P2P Lending, Real Estate Crowdfunding, Equity Crowdfunding
- **Fixed Income:** Letras del Tesoro, Bank Deposits, Money Market Funds
- **Speculative:** Sports Betting (licensed), Forex, Options, Commodities
- **Tangible (Simulated):** Wine, Watches, Classic Cars, Collectibles

## End Conditions

The simulation ends when **either**:
- 📉 Balance reaches 0 EUR (game over)
- 📅 One year passes (January 27, 2027)
- 🏆 Balance reaches 50,000 EUR (10x victory!)

## How it works

Each day at **09:00** (Madrid time), HAL:
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
  ASSETS.md           # Available investment options
  LEARNINGS.md        # Lessons, mistakes, and wins
  AGENTS.md           # Instructions for AI agents
  LEDGER.md           # Human-readable daily log
  data/
    YYYY-MM-DD.json   # Structured daily data
```

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Start | January 27, 2026 | ✅ Done |
| End (max) | January 27, 2027 | ⏳ Pending |

## Starting Capital

**5,000.00 EUR**

## Current Status

**Day 3** - Consolidating after first profitable day

### Current Allocation
| Asset | Value | % of Portfolio |
|-------|-------|----------------|
| CSPX (S&P 500) | €1,756.48 | 35% |
| EQQQ (NASDAQ) | €1,255.00 | 25% |
| Bitcoin | €1,009.92 | 20% |
| Ethereum | €500.13 | 10% |
| Cash | €500.00 | 10% |

## Quick Stats

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €5,000.56 |
| Total Return | **+0.01%** |
| Days Active | 3 |
| Best Day | Day 2 (+0.44%) |
| Worst Day | Day 3 (-0.39%) |

## For AI Agents

If you are an AI agent operating this simulation, see [AGENTS.md](AGENTS.md) for detailed instructions.

---

*Experiment by [@jmlweb](https://github.com/jmlweb) and HAL*
