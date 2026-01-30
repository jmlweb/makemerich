#!/usr/bin/env node
/**
 * MakeMeRich - Portfolio Analyzer
 * 
 * Advanced analytics: volatility, correlation, trends, scenarios.
 * 
 * Usage:
 *   node scripts/analyze-portfolio.js [--full]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STARTING_CAPITAL = 5000;

function getAllEntries() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
}

function calculateVolatility(returns) {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length < 2) return 0;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX, dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}

function calculateDrawdown(values) {
  let maxVal = values[0];
  let maxDrawdown = 0;
  for (const val of values) {
    maxVal = Math.max(maxVal, val);
    const drawdown = (maxVal - val) / maxVal;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }
  return maxDrawdown * 100;
}

function analyzePortfolio() {
  const entries = getAllEntries();
  if (entries.length < 2) {
    console.log('Need at least 2 days of data for analysis.');
    return;
  }
  
  console.log('\n📊 PORTFOLIO ANALYSIS\n');
  console.log('═'.repeat(50));
  
  // Basic stats
  const latest = entries[entries.length - 1];
  const totalReturn = ((latest.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  const balances = entries.map(e => e.balance.total);
  const dailyReturns = [];
  for (let i = 1; i < balances.length; i++) {
    dailyReturns.push(((balances[i] - balances[i-1]) / balances[i-1]) * 100);
  }
  
  console.log('\n📈 PERFORMANCE\n');
  console.log(`   Days Active:     ${entries.length}`);
  console.log(`   Current Balance: €${latest.balance.total.toFixed(2)}`);
  console.log(`   Total Return:    ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  console.log(`   Best Day:        ${dailyReturns.length > 0 ? '+' + Math.max(...dailyReturns).toFixed(2) + '%' : 'N/A'}`);
  console.log(`   Worst Day:       ${dailyReturns.length > 0 ? Math.min(...dailyReturns).toFixed(2) + '%' : 'N/A'}`);
  console.log(`   Avg Daily:       ${dailyReturns.length > 0 ? (dailyReturns.reduce((a,b) => a+b, 0) / dailyReturns.length).toFixed(2) + '%' : 'N/A'}`);
  
  // Volatility
  console.log('\n📉 RISK METRICS\n');
  const portfolioVol = calculateVolatility(dailyReturns);
  const maxDrawdown = calculateDrawdown(balances);
  console.log(`   Daily Volatility: ${portfolioVol.toFixed(2)}%`);
  console.log(`   Max Drawdown:     -${maxDrawdown.toFixed(2)}%`);
  
  // Sharpe-like ratio (simplified, assuming 0% risk-free)
  const avgReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a,b) => a+b, 0) / dailyReturns.length : 0;
  const sharpe = portfolioVol > 0 ? (avgReturn / portfolioVol) : 0;
  console.log(`   Sharpe Ratio:     ${sharpe.toFixed(2)}`);
  
  // Per-asset analysis
  console.log('\n🎯 ASSET PERFORMANCE\n');
  const assetReturns = {};
  for (const pos of latest.positions) {
    const returns = [];
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i-1].positions.find(p => p.asset === pos.asset);
      const curr = entries[i].positions.find(p => p.asset === pos.asset);
      if (prev && curr) {
        returns.push(((curr.value - prev.value) / prev.value) * 100);
      }
    }
    assetReturns[pos.asset] = returns;
    const vol = calculateVolatility(returns);
    const total = pos.pnlPercent;
    console.log(`   ${pos.asset}:`);
    console.log(`      Total: ${total >= 0 ? '+' : ''}${total.toFixed(2)}% | Vol: ${vol.toFixed(2)}% | Value: €${pos.value.toFixed(2)}`);
  }
  
  // Correlation matrix
  console.log('\n🔗 CORRELATION MATRIX\n');
  const assets = Object.keys(assetReturns);
  let header = '         ';
  for (const a of assets) header += a.padStart(8);
  console.log(header);
  for (const a1 of assets) {
    let row = `   ${a1.padEnd(5)}`;
    for (const a2 of assets) {
      const corr = calculateCorrelation(assetReturns[a1], assetReturns[a2]);
      row += corr.toFixed(2).padStart(8);
    }
    console.log(row);
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS\n');
  const recommendations = [];
  
  // Check diversification
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const corr = calculateCorrelation(assetReturns[assets[i]], assetReturns[assets[j]]);
      if (corr > 0.8) {
        recommendations.push(`⚠️ ${assets[i]} and ${assets[j]} highly correlated (${(corr*100).toFixed(0)}%) - diversification weak`);
      }
    }
  }
  
  // Check volatility
  if (portfolioVol > 3) {
    recommendations.push('⚠️ High daily volatility (>3%) - consider reducing high-risk positions');
  }
  
  // Check drawdown
  if (maxDrawdown > 10) {
    recommendations.push('🛑 Significant drawdown (>10%) - review stop-loss levels');
  }
  
  // Check concentration
  const maxAlloc = Math.max(...latest.positions.map(p => (p.value / latest.balance.total) * 100));
  if (maxAlloc > 40) {
    recommendations.push(`⚠️ High concentration (${maxAlloc.toFixed(0)}%) - consider rebalancing`);
  }
  
  // Positive notes
  if (totalReturn > 0) {
    recommendations.push('✅ Portfolio in profit - stay disciplined');
  }
  if (portfolioVol < 2 && entries.length >= 5) {
    recommendations.push('✅ Low volatility - stable performance');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ No immediate concerns - continue monitoring');
  }
  
  recommendations.forEach(r => console.log(`   ${r}`));
  
  console.log('\n' + '═'.repeat(50));
  console.log('Analysis complete\n');
}

analyzePortfolio();
