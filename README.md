# MakeMeRich

An AI-driven investment simulation experiment.

## Portfolio Performance

![Balance Chart](https://quickchart.io/chart?w=600&h=300&c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Day%201%22%2C%22Day%202%22%2C%22Day%203%22%2C%22Day%204%22%2C%22Day%205%22%2C%22Day%206%22%2C%22Day%207%22%2C%22Day%208%22%2C%22Day%209%22%2C%22Day%2010%22%2C%22Day%2011%22%2C%22Day%2012%22%2C%22Day%2013%22%2C%22Day%2014%22%2C%22Day%2015%22%2C%22Day%2016%22%2C%22Day%2017%22%2C%22Day%2018%22%2C%22Day%2019%22%2C%22Day%2020%22%2C%22Day%2021%22%2C%22Day%2022%22%2C%22Day%2023%22%2C%22Day%2024%22%2C%22Day%2025%22%2C%22Day%2026%22%2C%22Day%2027%22%2C%22Day%2028%22%2C%22Day%2029%22%2C%22Day%2030%22%2C%22Day%2031%22%2C%22Day%2032%22%2C%22Day%2033%22%2C%22Day%2034%22%2C%22Day%2035%22%2C%22Day%2036%22%2C%22Day%2037%22%2C%22Day%2038%22%2C%22Day%2039%22%2C%22Day%2040%22%2C%22Day%2041%22%2C%22Day%2042%22%2C%22Day%2043%22%2C%22Day%2044%22%2C%22Day%2045%22%2C%22Day%2046%22%2C%22Day%2047%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Balance%20EUR%22%2C%22data%22%3A%5B5000.0%2C5000.0%2C4975.68%2C4958.2%2C4596.69%2C4610.73%2C4600.06%2C4545.93%2C4635.3%2C4666.81%2C4631.56%2C4588.43%2C4528.99%2C4620.53%2C4583.51%2C4580.69%2C4585.68%2C4593.48%2C4633.7%2C4534.9%2C4552.4%2C4707.77%2C4664.71%2C4593.74%2C4700.82%2C4647.7%2C4828.61%2C4749.02%2C4646.88%2C4682.12%2C4737.81%2C4730.38%2C4722.23%2C4745.85%2C4878.69%2C4884.56%2C4835.59%2C4754.27%2C4709.31%2C4716.37%2C4704.38%2C4753.81%2C4644.76%2C3768.05%2C3778.11%2C4235.32%2C4274.53%5D%2C%22borderColor%22%3A%22%233b82f6%22%2C%22backgroundColor%22%3A%22rgba%2859%2C130%2C246%2C0.15%29%22%2C%22fill%22%3Atrue%2C%22tension%22%3A0.2%2C%22pointRadius%22%3A0%7D%5D%7D%2C%22options%22%3A%7B%22plugins%22%3A%7B%22title%22%3A%7B%22display%22%3Atrue%2C%22text%22%3A%22MakeMeRich%20Portfolio%22%7D%2C%22annotation%22%3A%7B%22annotations%22%3A%7B%22start%22%3A%7B%22type%22%3A%22line%22%2C%22yMin%22%3A5000%2C%22yMax%22%3A5000%2C%22borderColor%22%3A%22%2394a3b8%22%2C%22borderDash%22%3A%5B5%2C5%5D%2C%22borderWidth%22%3A1%2C%22label%22%3A%7B%22display%22%3Atrue%2C%22content%22%3A%22Start%20EUR%205%2C000%22%2C%22position%22%3A%22start%22%7D%7D%7D%7D%7D%2C%22scales%22%3A%7B%22y%22%3A%7B%22min%22%3A3500%2C%22max%22%3A5200%7D%7D%7D%7D)

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
