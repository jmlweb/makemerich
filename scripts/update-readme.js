#!/usr/bin/env node
/**
 * MakeMeRich - README Updater
 *
 * Updates dynamic sections of README.md (chart, metrics, positions)
 * without overwriting the rest of the content.
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
    'BTC': '₿'
  }[pos.asset] || '📊';

  const pnl = pos.asset === 'CASH' ? '—' :
    `${pos.pnlPercent >= 0 ? '+' : ''}${pos.pnlPercent.toFixed(2)}%`;

  const allocation = ((pos.value / STARTING_CAPITAL) * 100).toFixed(1);

  return `| ${emoji} ${pos.asset} | ${allocation}% (€${pos.value.toFixed(2)}) | ${pnl} |`;
}

function getLatestSummary(latest) {
  const positions = latest.positions.filter(p => p.asset !== 'CASH');
  if (positions.length === 0) return 'All cash position.';

  const best = positions.reduce((a, b) => (a.pnlPercent > b.pnlPercent ? a : b), positions[0]);
  const worst = positions.reduce((a, b) => (a.pnlPercent < b.pnlPercent ? a : b), positions[0]);

  const bestStr = `${best.asset} ${best.pnlPercent >= 0 ? '+' : ''}${best.pnlPercent.toFixed(2)}%`;
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
const day = latest.day || entries.length;
const totalReturn = ((latest.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
const chartUrl = generateChartUrl(entries);

const positionsTable = latest.positions
  .sort((a, b) => b.value - a.value)
  .map(formatPosition)
  .join('\n');

let readme = fs.readFileSync(README_PATH, 'utf8');

// Update chart image
readme = readme.replace(
  /!\[Balance Chart\]\(.*?\)/,
  `![Balance Chart](${chartUrl})`
);

// Update metrics table
readme = readme.replace(
  /\| Current Balance \| .* \|/,
  `| Current Balance | €${latest.balance.total.toFixed(2)} |`
);
readme = readme.replace(
  /\| Total Return \| .* \|/,
  `| Total Return | **${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%** |`
);
readme = readme.replace(
  /\| Days Active \| .* \|/,
  `| Days Active | ${day} |`
);

// Update positions table (between "## Current Positions" and the next > blockquote)
const posSection = `## Current Positions

| Asset | Allocation | P/L |
|-------|------------|-----|
${positionsTable}

> **Day ${day} Close:** ${getLatestSummary(latest)}`;

readme = readme.replace(
  /## Current Positions[\s\S]*?(?=\n## )/,
  posSection + '\n\n'
);

// Update last updated
readme = readme.replace(
  /\*Last updated: .*/,
  `*Last updated: ${new Date().toISOString().split('T')[0]} by Hustle*`
);

fs.writeFileSync(README_PATH, readme);
console.log(`✅ README.md updated (Day ${day}, €${latest.balance.total.toFixed(2)})`);
