#!/usr/bin/env node
/**
 * MakeMeRich - README Updater
 * 
 * Automatically updates README.md with latest portfolio data and chart.
 * 
 * Usage:
 *   node scripts/update-readme.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const README_PATH = path.join(__dirname, '..', 'README.md');
const STARTING_CAPITAL = 5000;

function getAllEntries() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
}

function generateChartUrl(entries) {
  const labels = entries.map((_, i) => `Day ${i + 1}`);
  const data = entries.map(e => e.balance.total.toFixed(2));
  
  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Balance €',
        data,
        borderColor: '#36a2eb',
        backgroundColor: 'rgba(54,162,235,0.2)',
        fill: true
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            callback: (val) => val + '€',
            min: Math.min(...data.map(Number)) - 100,
            max: Math.max(...data.map(Number)) + 100
          }
        }]
      }
    }
  };
  
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

function formatPosition(pos) {
  const emoji = {
    'CASH': '💵',
    'VOO': '📈',
    'GLD': '🥇',
    'QQQ': '📱',
    'BTC': '₿'
  }[pos.asset] || '📊';
  
  const pnl = pos.asset === 'CASH' ? '—' : 
    `${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`;
  
  const allocation = ((pos.value / STARTING_CAPITAL) * 100).toFixed(1);
  
  return `| ${emoji} ${pos.asset} | ${allocation}% (€${pos.value.toFixed(2)}) | ${pnl} |`;
}

function generateReadme(entries, latest) {
  const totalReturn = ((latest.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  const chartUrl = generateChartUrl(entries);
  const day = latest.day || entries.length;
  
  const positionsTable = latest.positions
    .sort((a, b) => b.value - a.value)
    .map(formatPosition)
    .join('\n');

  return `# 💰 MakeMeRich

An AI-driven investment simulation experiment.

## 📊 Portfolio Performance

![Balance Chart](${chartUrl})

| Metric | Value |
|--------|-------|
| Starting Capital | €5,000.00 |
| Current Balance | €${latest.balance.total.toFixed(2)} |
| Total Return | **${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%** |
| Days Active | ${day} |

## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
${positionsTable}

> **Day ${day} Close:** ${getLatestSummary(latest)}

## What is this?

A public experiment where **HAL** (AI powered by Claude) makes investment decisions with €5,000 of simulated capital.

**This is NOT financial advice.** Simulation for educational/entertainment purposes only.

## Rules

1. **Legal investments only** — anything legal in Spain
2. **Real market data** — actual prices and conditions
3. **Full transparency** — all decisions and reasoning public
4. **No private data** — nothing confidential published

## End Conditions

- 📉 Balance reaches €0 (game over)
- 📅 One year passes (January 27, 2027)
- 🏆 Balance reaches €50,000 (10x victory!)

## How it works

HAL monitors markets 5x daily (09:00, 12:00, 15:30, 18:00, 21:30 CET) and:
1. Fetches real market data
2. Analyzes conditions
3. Makes buy/sell decisions
4. Records everything in [LEDGER.md](LEDGER.md)

## Structure

\`\`\`
makemerich/
├── README.md         # This file (auto-updated)
├── LEDGER.md         # Daily log
├── STRATEGY.md       # Investment approach
├── data/             # Historical JSON data
└── scripts/          # Automation scripts
\`\`\`

## Links

- 📊 [Live Dashboard](dashboard.html)
- 📒 [Investment Ledger](LEDGER.md)
- 📋 [Strategy Document](STRATEGY.md)

---

*Last updated: ${new Date().toISOString().split('T')[0]} by HAL 🤖*
`;
}

function getLatestSummary(latest) {
  const positions = latest.positions.filter(p => p.asset !== 'CASH');
  const best = positions.reduce((a, b) => (a.pnlPercent > b.pnlPercent ? a : b), positions[0]);
  const worst = positions.reduce((a, b) => (a.pnlPercent < b.pnlPercent ? a : b), positions[0]);
  
  if (positions.length === 0) return 'All cash position.';
  
  const bestStr = best ? `${best.asset} ${best.pnlPercent >= 0 ? '+' : ''}${best.pnlPercent.toFixed(2)}%` : '';
  const worstStr = worst && worst !== best ? `, ${worst.asset} ${worst.pnlPercent >= 0 ? '+' : ''}${worst.pnlPercent.toFixed(2)}%` : '';
  
  return `${bestStr}${worstStr}.`;
}

// Main
const entries = getAllEntries();
if (entries.length === 0) {
  console.error('No data entries found');
  process.exit(1);
}

const latest = entries[entries.length - 1];
const readme = generateReadme(entries, latest);

fs.writeFileSync(README_PATH, readme);
const day = latest.day || entries.length;
console.log(`✅ README.md updated (Day ${day}, €${latest.balance.total.toFixed(2)})`);
