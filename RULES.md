# 📜 Rules of the Game

## Core Rules

### 1. One Entry Per Day
- **Exactly one** ledger entry per calendar day (Europe/Madrid timezone)
- Entry must include: date, balance, positions, reasoning
- No retroactive changes to past entries

### 2. Real Market Data Only
- All prices must be from verifiable sources
- Record the source and timestamp of price data
- Use closing prices for daily calculations (or latest available for 24/7 markets)

### 3. Legal Investments Only
All investments must be legal in Spain. This includes but is not limited to:

#### Traditional Markets
- **Stocks** — Individual equities (any market)
- **ETFs/ETCs** — Index funds, sector funds, commodity trackers
- **Bonds** — Government, corporate, municipal
- **Mutual Funds** — Regulated investment funds
- **REITs/SOCIMIs** — Real estate investment trusts

#### Alternative Investments
- **Cryptocurrencies** — Bitcoin, Ethereum, altcoins
- **Commodities** — Gold, silver, oil, agricultural (via ETCs or futures)
- **Forex** — Currency pairs
- **P2P Lending** — Platforms like Mintos, Bondora
- **Crowdfunding** — Equity crowdfunding, real estate crowdfunding
- **Letras del Tesoro** — Spanish Treasury bills

#### Tangible Assets (simulated)
- **Art & Collectibles** — Fractional art investment platforms
- **Wine** — Wine investment funds
- **Classic Cars** — Simulated classic car appreciation
- **Watches** — Luxury watch market

#### Other Legal Options
- **Sports Betting** — Licensed operators in Spain (with strict bankroll management)
- **Prediction Markets** — Where legally available
- **Startup Equity** — Via regulated platforms

### 4. Position Limits

| Limit | Default | Current Override |
|-------|---------|-----------------|
| Max single position | 50% | — (active) |
| Min cash reserve | 5% | — (active) |
| Max high-risk assets | 30% | **Suspended** — Aggressive Mandate 2026-03-29 |

> **Override mechanism:** STRATEGY.md § "Updated Mandate" can suspend specific limits. The mandate must state which limits are overridden and the rationale. When no mandate is active, all defaults apply.

### 5. Transaction Rules
- All buys/sells execute at next available market price
- Simulate realistic spreads and fees:
  - Stocks/ETFs: 0.1% fee
  - Crypto: 0.5% fee
  - Forex: spread included in price
  - Alternative investments: as per platform

### 6. Loss Limits
- **Stop-loss**: Exit any position down 15% from entry
- **Trailing stop**: Exit any position down 10% from its high
- **Portfolio stop**: If total balance drops below €1,000, switch to capital preservation mode

### 7. Profit Taking
- Take **25% partial profits** when a position gains 30%+
- Take another **25%** at +50%
- Rebalance monthly if allocations drift more than 10% from targets

### 8. Transparency
- All decisions and reasoning must be public
- No private data or credentials in the repo
- Document mistakes and learnings

### 9. Documentation Language
- All documentation must be written in **English**
- This applies to all files in the repository: LEDGER, SIGNALS, ASSETS, LEARNINGS, STRATEGY, README, etc.
- Spanish terms may be kept when they are proper names (e.g., SOCIMIs, DGOJ, Letras del Tesoro, CNMV, MEFF)

## End Conditions

The simulation ends when:
- 📉 **Balance reaches €0** — Game Over
- 📅 **One year passes** (January 27, 2027) — Final tally
- 🏆 **Balance reaches €50,000** — Victory condition (10x)

## Scoring

Final score based on:
1. **Total Return** — Percentage gain/loss
2. **Risk-Adjusted Return** — Sharpe ratio approximation
3. **Max Drawdown** — Largest peak-to-trough decline
4. **Win Rate** — Percentage of profitable trades
