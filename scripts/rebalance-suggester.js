#!/usr/bin/env node
/**
 * MakeMeRich - Rebalance Suggester
 * 
 * Analyzes portfolio drift and suggests trades to rebalance.
 * Also suggests diversification improvements based on correlation.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Target allocation (can be customized)
const TARGET_ALLOCATION = {
  CSPX: 0.35,  // 35% S&P 500
  EQQQ: 0.25,  // 25% NASDAQ
  BTC: 0.20,   // 20% Bitcoin
  ETH: 0.10,   // 10% Ethereum
  cash: 0.10   // 10% Cash
};

// Diversification suggestions - uncorrelated assets
const DIVERSIFICATION_OPTIONS = [
  { asset: 'IGLN', type: 'ETF', description: 'iShares Physical Gold', correlation: -0.2, reason: 'Gold hedges against equity/crypto drops' },
  { asset: 'IBTA', type: 'ETF', description: 'iShares Euro Aggregate Bond', correlation: 0.1, reason: 'Bonds provide stability in downturns' },
  { asset: 'REIT', type: 'ETF', description: 'Real Estate ETF', correlation: 0.4, reason: 'Real estate has moderate correlation' },
  { asset: 'CASH', type: 'Cash', description: 'Increase cash buffer', correlation: 0, reason: 'Cash is the ultimate hedge' }
];

function getLatestEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), 'utf8'));
}

function calculateDrift(current, target) {
  return Math.abs(current - target);
}

function suggestRebalance() {
  const entry = getLatestEntry();
  if (!entry) {
    console.log('No data found.');
    return;
  }

  const total = entry.balance.total;
  const currentAlloc = {};
  
  for (const pos of entry.positions) {
    currentAlloc[pos.asset] = pos.value / total;
  }
  currentAlloc.cash = (entry.allocation.cash || 500) / total;

  console.log('\n🔄 REBALANCE ANALYSIS\n');
  console.log('═'.repeat(60));
  
  console.log('\n📊 CURRENT VS TARGET ALLOCATION\n');
  console.log('Asset     Current    Target     Drift      Action');
  console.log('─'.repeat(60));
  
  const suggestions = [];
  let totalDrift = 0;
  
  for (const [asset, target] of Object.entries(TARGET_ALLOCATION)) {
    const current = currentAlloc[asset] || 0;
    const drift = calculateDrift(current, target);
    totalDrift += drift;
    
    const currentPct = (current * 100).toFixed(1) + '%';
    const targetPct = (target * 100).toFixed(1) + '%';
    const driftPct = (drift * 100).toFixed(1) + '%';
    
    let action = '✓ OK';
    if (drift > 0.05) { // 5% threshold
      if (current > target) {
        action = `↓ SELL €${((current - target) * total).toFixed(0)}`;
        suggestions.push({ asset, action: 'SELL', amount: (current - target) * total });
      } else {
        action = `↑ BUY €${((target - current) * total).toFixed(0)}`;
        suggestions.push({ asset, action: 'BUY', amount: (target - current) * total });
      }
    }
    
    console.log(`${asset.padEnd(10)}${currentPct.padEnd(11)}${targetPct.padEnd(11)}${driftPct.padEnd(11)}${action}`);
  }
  
  console.log('─'.repeat(60));
  console.log(`Total Drift: ${(totalDrift * 100 / 2).toFixed(1)}%`);
  
  // Rebalance threshold
  if (totalDrift / 2 > 0.10) {
    console.log('\n⚠️  Portfolio drift >10% - REBALANCING RECOMMENDED');
  } else if (totalDrift / 2 > 0.05) {
    console.log('\n🟡 Portfolio drift 5-10% - Consider rebalancing');
  } else {
    console.log('\n✅ Portfolio within tolerance - No rebalancing needed');
  }
  
  // Diversification suggestions
  console.log('\n\n💡 DIVERSIFICATION SUGGESTIONS\n');
  console.log('Based on high correlation analysis, consider adding:');
  console.log('');
  
  for (const option of DIVERSIFICATION_OPTIONS) {
    console.log(`   ${option.asset} (${option.type})`);
    console.log(`   └─ ${option.description}`);
    console.log(`   └─ Correlation with portfolio: ${option.correlation}`);
    console.log(`   └─ ${option.reason}`);
    console.log('');
  }
  
  // Specific recommendation based on current state
  console.log('\n🎯 RECOMMENDED ACTION\n');
  
  const ethPnl = entry.positions.find(p => p.asset === 'ETH')?.pnlPercent || 0;
  const btcPnl = entry.positions.find(p => p.asset === 'BTC')?.pnlPercent || 0;
  
  if (ethPnl < -10 || btcPnl < -10) {
    console.log('   DEFENSIVE MODE: Crypto down significantly');
    console.log('   → Consider reducing ETH position (worst performer)');
    console.log('   → Move freed capital to IGLN (gold) for hedge');
    console.log('   → Keep BTC as it has better long-term prospects');
  } else if (ethPnl > 20 || btcPnl > 20) {
    console.log('   TAKE PROFITS: Crypto up significantly');
    console.log('   → Take 25% profits on winning positions');
    console.log('   → Reinvest in underweight positions');
  } else {
    console.log('   HOLD: No extreme conditions');
    console.log('   → Continue monitoring');
    console.log('   → Consider small diversification into gold (2-5%)');
  }
  
  console.log('\n' + '═'.repeat(60));
  
  return suggestions;
}

suggestRebalance();
