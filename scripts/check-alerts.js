#!/usr/bin/env node
/**
 * MakeMeRich - Alert Checker
 * 
 * Checks for important conditions and returns alerts.
 * Can be used by cron to trigger notifications.
 * 
 * Usage:
 *   node scripts/check-alerts.js [--json]
 * 
 * Exit codes:
 *   0 = No critical alerts
 *   1 = Has critical alerts (stop-loss, etc)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STARTING_CAPITAL = 5000;

const THRESHOLDS = {
  STOP_LOSS: -20,           // Individual position
  TAKE_PROFIT: 30,          // Individual position
  PORTFOLIO_DANGER: -10,    // Total portfolio
  PORTFOLIO_CRITICAL: -20,  // Total portfolio
  PORTFOLIO_WIN: 10,        // Total portfolio
  VOLATILITY_HIGH: 3,       // Daily volatility %
};

function getLatestEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), 'utf8'));
}

function checkAlerts() {
  const entry = getLatestEntry();
  if (!entry) return { alerts: [], critical: false };

  const alerts = [];
  let hasCritical = false;

  const totalReturn = ((entry.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;

  // Portfolio-level alerts
  if (totalReturn <= THRESHOLDS.PORTFOLIO_CRITICAL) {
    alerts.push({
      level: 'CRITICAL',
      emoji: '🚨',
      message: `Portfolio down ${totalReturn.toFixed(1)}% - CRITICAL LEVEL`,
      action: 'Consider emergency liquidation of risky positions'
    });
    hasCritical = true;
  } else if (totalReturn <= THRESHOLDS.PORTFOLIO_DANGER) {
    alerts.push({
      level: 'WARNING',
      emoji: '⚠️',
      message: `Portfolio down ${totalReturn.toFixed(1)}% from start`,
      action: 'Review positions, consider reducing risk'
    });
  }

  if (totalReturn >= THRESHOLDS.PORTFOLIO_WIN) {
    alerts.push({
      level: 'INFO',
      emoji: '🎉',
      message: `Portfolio up ${totalReturn.toFixed(1)}%!`,
      action: 'Consider taking some profits'
    });
  }

  // Position-level alerts
  for (const pos of entry.positions) {
    if (pos.pnlPercent <= THRESHOLDS.STOP_LOSS) {
      alerts.push({
        level: 'CRITICAL',
        emoji: '🛑',
        message: `STOP-LOSS: ${pos.asset} down ${pos.pnlPercent.toFixed(1)}%`,
        action: `Sell ${pos.asset} immediately per rules`
      });
      hasCritical = true;
    } else if (pos.pnlPercent <= -15) {
      alerts.push({
        level: 'WARNING',
        emoji: '🟠',
        message: `${pos.asset} down ${pos.pnlPercent.toFixed(1)}% - approaching stop-loss`,
        action: 'Prepare exit strategy'
      });
    }

    if (pos.pnlPercent >= THRESHOLDS.TAKE_PROFIT) {
      alerts.push({
        level: 'INFO',
        emoji: '💰',
        message: `TAKE-PROFIT: ${pos.asset} up ${pos.pnlPercent.toFixed(1)}%!`,
        action: 'Take 25% profits per rules'
      });
    }
  }

  // Daily change alerts
  if (Math.abs(entry.change.percentage) > 5) {
    const direction = entry.change.percentage > 0 ? 'up' : 'down';
    alerts.push({
      level: 'INFO',
      emoji: entry.change.percentage > 0 ? '📈' : '📉',
      message: `Big move: ${direction} ${Math.abs(entry.change.percentage).toFixed(1)}% today`,
      action: 'Review market conditions'
    });
  }

  // Balance check
  if (entry.balance.total < 1000) {
    alerts.push({
      level: 'CRITICAL',
      emoji: '🚨',
      message: 'Balance below €1,000!',
      action: 'GAME OVER warning - preserve remaining capital'
    });
    hasCritical = true;
  }

  return { alerts, critical: hasCritical, entry };
}

function formatAlerts(result, json = false) {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  if (result.alerts.length === 0) {
    return '✅ No alerts - all clear';
  }

  let output = `📊 MakeMeRich Day ${result.entry.day} Alerts\n`;
  output += `💰 Balance: €${result.entry.balance.total.toFixed(2)}\n\n`;

  for (const alert of result.alerts) {
    output += `${alert.emoji} [${alert.level}] ${alert.message}\n`;
    output += `   → ${alert.action}\n\n`;
  }

  return output;
}

// Main
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

const result = checkAlerts();
console.log(formatAlerts(result, jsonOutput));

// Exit with code 1 if critical alerts
process.exit(result.critical ? 1 : 0);
