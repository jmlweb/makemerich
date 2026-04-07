#!/usr/bin/env node
/**
 * MakeMeRich - Complete Daily Routine
 * 
 * Runs all daily tasks in sequence:
 * 1. Update portfolio with latest prices
 * 2. Check for alerts
 * 3. Run analysis
 * 4. Suggest rebalancing
 * 5. Generate dashboard
 * 6. Output summary for notifications
 * 
 * Usage:
 *   node scripts/daily-routine.js [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = __dirname;
const DATA_DIR = path.join(__dirname, '..', 'data');

function run(script, args = '') {
  try {
    return execSync(`node ${path.join(SCRIPTS_DIR, script)} ${args}`, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    return error.stdout || error.message;
  }
}

function getLatestEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), 'utf8'));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('\n🚀 MAKEMERICH DAILY ROUTINE\n');
  console.log('='.repeat(50));
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(50));
  
  // Step 1: Fetch historical data
  console.log('\n📊 Step 1: Updating historical data...');
  const historyResult = run('fetch-history.js');
  console.log(historyResult.split('\n').slice(-3).join('\n'));

  // Step 2: Update portfolio
  console.log('\n📊 Step 2: Updating portfolio...');
  const updateResult = run('update-portfolio.js', dryRun ? '--dry-run' : '');
  console.log(updateResult.split('\n').slice(-5).join('\n'));

  // Step 3: Check alerts
  console.log('\n⚠️ Step 3: Checking alerts...');
  const alertsResult = run('check-alerts.js');
  console.log(alertsResult);

  // Step 4: Generate quant signals
  console.log('\n📈 Step 4: Generating quant signals...');
  const quantResult = run('generate-quant-signals.js');
  console.log(quantResult);

  // Step 5: Generate dashboard
  console.log('📱 Step 5: Generating dashboard...');
  run('generate-dashboard.js');
  console.log('Dashboard updated!');
  
  // Get latest entry for summary
  const entry = getLatestEntry();
  if (!entry) {
    console.log('\n❌ No data found!');
    return;
  }
  
  // Generate notification summary
  const totalReturn = ((entry.balance.total - 5000) / 5000 * 100).toFixed(2);
  const bestAsset = entry.positions.reduce((a, b) => a.pnlPercent > b.pnlPercent ? a : b);
  const worstAsset = entry.positions.reduce((a, b) => a.pnlPercent < b.pnlPercent ? a : b);
  
  const summary = `
📊 MakeMeRich Day ${entry.day}
💰 Balance: €${entry.balance.total.toFixed(2)}
${entry.change.percentage >= 0 ? '🟢' : '🔴'} Today: ${entry.change.percentage >= 0 ? '+' : ''}${entry.change.percentage.toFixed(2)}%
📈 Total: ${totalReturn >= 0 ? '+' : ''}${totalReturn}%

🏆 Best: ${bestAsset.asset} (${bestAsset.pnlPercent >= 0 ? '+' : ''}${bestAsset.pnlPercent.toFixed(1)}%)
📉 Worst: ${worstAsset.asset} (${worstAsset.pnlPercent.toFixed(1)}%)

🎯 Plan: ${entry.nextDayPlan?.action || 'HOLD'}
`;
  
  console.log('\n' + '='.repeat(50));
  console.log('NOTIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(summary);
  
  // Write summary to file for external use
  fs.writeFileSync(
    path.join(DATA_DIR, '.daily-summary.txt'),
    summary
  );
  
  console.log('\n✅ Daily routine complete!');
  console.log('Summary saved to data/.daily-summary.txt');
  
  // Return summary for programmatic use
  return summary;
}

main().catch(console.error);
