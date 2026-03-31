#!/usr/bin/env node
/**
 * MakeMeRich - Signal Generator
 *
 * Computes active alerts from portfolio.json + .prices-latest.json.
 * Replaces manual SIGNALS.md updates for stop-loss/take-profit levels.
 *
 * Usage:
 *   node scripts/generate-signals.js [--json]
 *
 * Output: data/.signals-latest.json + human-readable summary
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');
const PRICES_PATH = path.join(DATA_DIR, '.prices-latest.json');
const OUTPUT_PATH = path.join(DATA_DIR, '.signals-latest.json');

function load(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function generateSignals() {
  const portfolio = load(PORTFOLIO_PATH);
  if (!portfolio) throw new Error('portfolio.json not found');

  const prices = load(PRICES_PATH);
  const { holdings, totals } = portfolio;

  const alerts = [];
  const summary = {
    generatedAt: new Date().toISOString(),
    balance: totals.balance_eur,
    totalReturn: totals.pnl_pct,
  };

  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH') continue;

    const currentPrice = data.current_price_eur || data.current_price_usd;
    const entryPrice = data.entry_price_eur || data.entry_price_usd;
    const currency = data.current_price_eur ? 'EUR' : 'USD';
    const stopLoss = data.stop_loss_eur || data.stop_loss_usd || null;

    // Distance to stop-loss
    if (stopLoss != null && currentPrice != null) {
      const distancePct = ((currentPrice - stopLoss) / currentPrice) * 100;
      const alert = {
        asset,
        type: 'STOP_LOSS',
        currentPrice,
        triggerPrice: stopLoss,
        currency,
        distancePct: +distancePct.toFixed(2),
        status: distancePct <= 0 ? 'TRIGGERED' : distancePct < 5 ? 'NEAR' : 'ACTIVE',
      };
      alerts.push(alert);
    }

    // Take-profit at +30%
    if (entryPrice != null) {
      const tp30 = entryPrice * 1.30;
      const tp50 = entryPrice * 1.50;

      if (data.pnl_pct >= 30) {
        alerts.push({
          asset,
          type: 'TAKE_PROFIT_30',
          currentPrice,
          triggerPrice: +tp30.toFixed(2),
          currency,
          pnlPct: data.pnl_pct,
          status: 'TRIGGERED',
          action: 'Sell 25%',
        });
      }
      if (data.pnl_pct >= 50) {
        alerts.push({
          asset,
          type: 'TAKE_PROFIT_50',
          currentPrice,
          triggerPrice: +tp50.toFixed(2),
          currency,
          pnlPct: data.pnl_pct,
          status: 'TRIGGERED',
          action: 'Sell another 25%',
        });
      }
    }

    // 24h change from prices (if available)
    const priceData = prices?.prices?.[asset];
    if (priceData?.change) {
      const change = parseFloat(priceData.change);
      if (Math.abs(change) > 5) {
        alerts.push({
          asset,
          type: 'HIGH_VOLATILITY',
          change24h: change,
          status: 'INFO',
          detail: `${asset} moved ${change > 0 ? '+' : ''}${change.toFixed(2)}% in 24h`,
        });
      }
    }
  }

  // Portfolio-level signals
  if (totals.pnl_pct <= -10) {
    alerts.push({
      type: 'PORTFOLIO_DRAWDOWN',
      pnlPct: totals.pnl_pct,
      status: totals.pnl_pct <= -20 ? 'CRITICAL' : 'WARNING',
      detail: `Portfolio down ${totals.pnl_pct.toFixed(1)}% from start`,
    });
  }

  const result = { ...summary, alerts };

  // Save to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  return result;
}

function format(result, json = false) {
  if (json) return JSON.stringify(result, null, 2);

  const lines = [];
  lines.push('=== MakeMeRich Signals ===');
  lines.push(`Balance: EUR ${result.balance.toFixed(2)} (${result.totalReturn.toFixed(1)}%)`);
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push('');

  if (result.alerts.length === 0) {
    lines.push('No active signals.');
    return lines.join('\n');
  }

  // Group by status
  const triggered = result.alerts.filter(a => a.status === 'TRIGGERED' || a.status === 'CRITICAL');
  const near = result.alerts.filter(a => a.status === 'NEAR' || a.status === 'WARNING');
  const active = result.alerts.filter(a => a.status === 'ACTIVE');
  const info = result.alerts.filter(a => a.status === 'INFO');

  if (triggered.length > 0) {
    lines.push('TRIGGERED:');
    for (const a of triggered) {
      lines.push(`  ${a.asset || 'PORTFOLIO'} [${a.type}] ${a.detail || formatAlert(a)}`);
    }
    lines.push('');
  }

  if (near.length > 0) {
    lines.push('NEAR TRIGGER:');
    for (const a of near) {
      lines.push(`  ${a.asset || 'PORTFOLIO'} [${a.type}] ${a.detail || formatAlert(a)}`);
    }
    lines.push('');
  }

  if (active.length > 0) {
    lines.push('ACTIVE MONITORS:');
    for (const a of active) {
      lines.push(`  ${a.asset} [${a.type}] ${formatAlert(a)}`);
    }
    lines.push('');
  }

  if (info.length > 0) {
    lines.push('INFO:');
    for (const a of info) {
      lines.push(`  ${a.detail || formatAlert(a)}`);
    }
  }

  return lines.join('\n');
}

function formatAlert(a) {
  if (a.type === 'STOP_LOSS') {
    return `${a.currency} ${a.currentPrice} → stop at ${a.triggerPrice} (${a.distancePct.toFixed(1)}% away)`;
  }
  if (a.type.startsWith('TAKE_PROFIT')) {
    return `P&L +${a.pnlPct}% — ${a.action}`;
  }
  return JSON.stringify(a);
}

// Main
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

try {
  const result = generateSignals();
  console.log(format(result, jsonOutput));
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(1);
}
