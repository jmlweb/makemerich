#!/usr/bin/env node
/**
 * MakeMeRich - Dashboard Generator
 * 
 * Generates an HTML dashboard with charts.
 * 
 * Usage:
 *   node scripts/generate-dashboard.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT = path.join(__dirname, '..', 'dashboard.html');
const STARTING_CAPITAL = 5000;

function getAllEntries() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
}

function generateDashboard() {
  const entries = getAllEntries();
  const latest = entries[entries.length - 1];
  const totalReturn = ((latest.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  
  const dates = entries.map(e => e.date);
  const balances = entries.map(e => e.balance.total);
  const dailyChanges = entries.map(e => e.change.percentage);
  
  // Get asset data
  const assets = {};
  for (const pos of latest.positions) {
    assets[pos.asset] = {
      values: entries.map(e => {
        const p = e.positions.find(x => x.asset === pos.asset);
        return p ? p.value : 0;
      }),
      current: pos.value,
      pnl: pos.pnlPercent
    };
  }
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MakeMeRich Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #0f0f0f; color: #fff; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { font-size: 2rem; margin-bottom: 10px; }
    .header .balance { font-size: 3rem; font-weight: bold; }
    .header .change { font-size: 1.5rem; margin-top: 10px; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
    .card { background: #1a1a1a; border-radius: 12px; padding: 20px; }
    .card h2 { font-size: 1.2rem; margin-bottom: 15px; color: #888; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin: 20px 0; }
    .stat { background: #1a1a1a; padding: 15px 25px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: bold; }
    .stat-label { color: #888; font-size: 0.9rem; }
    .positions { margin-top: 20px; }
    .position { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
    .position:last-child { border-bottom: none; }
    .position-name { font-weight: 500; }
    .position-value { color: #888; }
    .position-pnl { font-weight: 500; }
    canvas { max-height: 250px; }
    .updated { text-align: center; color: #666; margin-top: 30px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>💰 MakeMeRich</h1>
    <div class="balance">€${latest.balance.total.toFixed(2)}</div>
    <div class="change ${totalReturn >= 0 ? 'positive' : 'negative'}">
      ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}% from start
    </div>
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-value">Day ${latest.day}</div>
      <div class="stat-label">Trading Days</div>
    </div>
    <div class="stat">
      <div class="stat-value ${latest.change.percentage >= 0 ? 'positive' : 'negative'}">
        ${latest.change.percentage >= 0 ? '+' : ''}${latest.change.percentage.toFixed(2)}%
      </div>
      <div class="stat-label">Today</div>
    </div>
    <div class="stat">
      <div class="stat-value">€${(latest.allocation.cash || 500).toFixed(0)}</div>
      <div class="stat-label">Cash</div>
    </div>
  </div>
  
  <div class="grid">
    <div class="card">
      <h2>📈 Portfolio Value</h2>
      <canvas id="balanceChart"></canvas>
    </div>
    <div class="card">
      <h2>📉 Daily Changes</h2>
      <canvas id="changesChart"></canvas>
    </div>
    <div class="card">
      <h2>🎯 Allocation</h2>
      <canvas id="allocationChart"></canvas>
    </div>
    <div class="card">
      <h2>📊 Positions</h2>
      <div class="positions">
        ${latest.positions.map(p => `
          <div class="position">
            <span class="position-name">${p.asset}</span>
            <span class="position-value">€${p.value.toFixed(2)}</span>
            <span class="position-pnl ${p.pnlPercent >= 0 ? 'positive' : 'negative'}">
              ${p.pnlPercent >= 0 ? '+' : ''}${p.pnlPercent.toFixed(1)}%
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
  
  <div class="updated">Updated: ${new Date().toLocaleString()}</div>
  
  <script>
    const chartOptions = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#333' }, ticks: { color: '#888' } },
        y: { grid: { color: '#333' }, ticks: { color: '#888' } }
      }
    };
    
    new Chart(document.getElementById('balanceChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [{
          data: ${JSON.stringify(balances)},
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: { ...chartOptions.scales.y, min: Math.min(...${JSON.stringify(balances)}) * 0.95 }
        }
      }
    });
    
    new Chart(document.getElementById('changesChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [{
          data: ${JSON.stringify(dailyChanges)},
          backgroundColor: ${JSON.stringify(dailyChanges)}.map(v => v >= 0 ? '#22c55e' : '#ef4444')
        }]
      },
      options: chartOptions
    });
    
    new Chart(document.getElementById('allocationChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(Object.keys(assets).concat(['Cash']))},
        datasets: [{
          data: ${JSON.stringify(Object.values(assets).map(a => a.current).concat([latest.allocation.cash || 500]))},
          backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#22c55e']
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT, html);
  console.log(`✅ Dashboard generated: ${OUTPUT}`);
}

generateDashboard();
