# 📚 Learnings

What I have learned running this simulation. Mistakes, successes, and patterns.

## Format

Each entry follows this structure:
```
### [Date] - [Title]
**Category:** [Market, Strategy, Execution, Psychology, Technical]
**Impact:** [Positive/Negative/Neutral] [amount if applicable]
**Lesson:** One-line summary
**Details:** Full explanation
**Action:** What I will do differently
```

---

## 2026

### January 27, 2026 - Day 1: Starting Allocation

**Category:** Strategy  
**Impact:** Neutral (baseline)  
**Lesson:** Started with a balanced growth allocation during a bull market.

**Details:**  
Allocated 60% to equities (35% S&P 500, 25% NASDAQ), 30% to crypto (20% BTC, 10% ETH), and kept 10% cash. The S&P 500 was at an all-time high (6,950.23), which is both an opportunity (momentum) and a risk (potential correction).

**Action:** Monitor for signs of correction. Have a plan ready to reduce exposure if momentum fades.

---

## Patterns Observed

*Recurring patterns I have noticed. Updated as the simulation progresses.*

| Pattern | Frequency | Notes |
|---------|-----------|-------|
| - | - | No patterns yet |

---

## Mistakes Log

*Honest record of mistakes to avoid repeating them.*

| Date | Mistake | Cost | Lesson |
|------|---------|------|--------|
| - | - | - | No mistakes yet (Day 1) |

---

## Wins Log

*What went well and why.*

| Date | Win | Gain | Why It Worked |
|------|-----|------|---------------|
| - | - | - | No wins yet (Day 1) |

---

## Strategy Adjustments

*Changes made to the strategy based on learnings.*

| Date | Change | Reason | Result |
|------|--------|--------|--------|
| - | - | - | No changes yet |

---

## Market Insights

*Observations about market behavior that might be useful.*

### Correlations Noticed
- *To be documented*

### Sentiment Indicators
- *To be documented*

### Timing Patterns
- *To be documented*

---

## Resources That Helped

*Useful sources for analysis and decisions.*

- **Price Data:** Yahoo Finance, CoinGecko
- **News:** Reuters, CNBC
- **Technical:** TradingView
- **Sentiment:** Fear and Greed Index

---

*This file is updated whenever there is something worth learning from. Mistakes are as valuable as wins.*

---

## 2026-01-30: Correlation Analysis

**Finding:** All assets are highly correlated (85-100%).

| Pair | Correlation |
|------|-------------|
| CSPX-EQQQ | 96% |
| BTC-ETH | 100% |
| EQQQ-BTC | 99% |

**Problem:** When crypto drops, everything drops together. No real diversification.

**Lesson:** Tech ETFs and crypto move together in risk-off environments.

**Action Items:**
1. Consider adding uncorrelated assets:
   - Gold (IGLN/GLD) - typically negative correlation
   - Bonds (IBTA) - low correlation in normal markets
   - Value stocks - less correlated with growth/tech
2. Keep more cash as buffer during volatile periods
3. Consider reducing one of BTC/ETH since they're 100% correlated

**New tools added:**
- `scripts/analyze-portfolio.js` - Volatility, correlation, recommendations
- `scripts/generate-dashboard.js` - Visual HTML dashboard
