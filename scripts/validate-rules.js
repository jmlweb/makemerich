#!/usr/bin/env node
/**
 * MakeMeRich - Rules Validator
 *
 * Validates current portfolio against RULES.md constraints.
 * Designed to run pre-trade and post-update (0 AI tokens).
 *
 * Usage:
 *   node scripts/validate-rules.js [--json]
 *
 * Exit codes:
 *   0 = All rules pass
 *   1 = One or more violations
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');

// Hard rules from RULES.md
const RULES = {
  MAX_SINGLE_POSITION_PCT: 50,
  MIN_CASH_RESERVE_PCT: 5,
  MAX_HIGH_RISK_PCT: 30,
  STOP_LOSS_PCT: -15,
  TRAILING_STOP_PCT: -10,
  TAKE_PROFIT_PARTIAL_PCT: 30,
  TAKE_PROFIT_SECOND_PCT: 50,
  CONSERVATION_BALANCE: 1000,
};

// Classification of assets by risk level
const HIGH_RISK_ASSETS = new Set(['BTC', 'ETH', 'SOL']);

function loadPortfolio() {
  if (!fs.existsSync(PORTFOLIO_PATH)) {
    throw new Error('portfolio.json not found');
  }
  return JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
}

function validate(portfolio) {
  const violations = [];
  const warnings = [];
  const { holdings, totals } = portfolio;
  const balance = totals.balance_eur;

  // 1. Check each position size (max 50%)
  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH') continue;
    const pct = (data.amount_eur / balance) * 100;
    if (pct > RULES.MAX_SINGLE_POSITION_PCT) {
      violations.push({
        rule: 'MAX_SINGLE_POSITION',
        asset,
        detail: `${asset} is ${pct.toFixed(1)}% of portfolio (limit: ${RULES.MAX_SINGLE_POSITION_PCT}%)`,
      });
    }
  }

  // 2. Check cash reserve (min 5%)
  const cashEur = holdings.CASH?.amount_eur || 0;
  const cashPct = (cashEur / balance) * 100;
  if (cashPct < RULES.MIN_CASH_RESERVE_PCT) {
    violations.push({
      rule: 'MIN_CASH_RESERVE',
      detail: `Cash is ${cashPct.toFixed(1)}% (minimum: ${RULES.MIN_CASH_RESERVE_PCT}%)`,
    });
  }

  // 3. Check high-risk allocation (max 30%)
  let highRiskTotal = 0;
  for (const [asset, data] of Object.entries(holdings)) {
    if (HIGH_RISK_ASSETS.has(asset)) {
      highRiskTotal += data.amount_eur;
    }
  }
  const highRiskPct = (highRiskTotal / balance) * 100;
  if (highRiskPct > RULES.MAX_HIGH_RISK_PCT) {
    // Check if aggressive mandate overrides this
    warnings.push({
      rule: 'MAX_HIGH_RISK',
      detail: `High-risk assets at ${highRiskPct.toFixed(1)}% (default limit: ${RULES.MAX_HIGH_RISK_PCT}%). Check if aggressive mandate is active.`,
    });
  }

  // 4. Check stop-loss levels per position
  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH') continue;
    if (data.pnl_pct <= RULES.STOP_LOSS_PCT) {
      violations.push({
        rule: 'STOP_LOSS_BREACH',
        asset,
        detail: `${asset} P&L is ${data.pnl_pct.toFixed(1)}% (stop-loss at ${RULES.STOP_LOSS_PCT}%) — SELL IMMEDIATELY`,
      });
    } else if (data.pnl_pct <= RULES.STOP_LOSS_PCT + 3) {
      warnings.push({
        rule: 'STOP_LOSS_NEAR',
        asset,
        detail: `${asset} P&L is ${data.pnl_pct.toFixed(1)}% — approaching stop-loss (${RULES.STOP_LOSS_PCT}%)`,
      });
    }
  }

  // 5. Check take-profit triggers
  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH') continue;
    if (data.pnl_pct >= RULES.TAKE_PROFIT_SECOND_PCT) {
      warnings.push({
        rule: 'TAKE_PROFIT_50',
        asset,
        detail: `${asset} up ${data.pnl_pct.toFixed(1)}% — consider taking second 25% profits`,
      });
    } else if (data.pnl_pct >= RULES.TAKE_PROFIT_PARTIAL_PCT) {
      warnings.push({
        rule: 'TAKE_PROFIT_30',
        asset,
        detail: `${asset} up ${data.pnl_pct.toFixed(1)}% — consider taking first 25% profits`,
      });
    }
  }

  // 6. Conservation mode check
  if (balance < RULES.CONSERVATION_BALANCE) {
    violations.push({
      rule: 'CONSERVATION_MODE',
      detail: `Balance EUR ${balance.toFixed(2)} < EUR ${RULES.CONSERVATION_BALANCE} — CAPITAL PRESERVATION MODE`,
    });
  }

  // 7. Verify stop-loss levels are set for all positions
  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH' || asset === 'XEON') continue; // XEON is money market, no stop needed
    const hasStop = data.stop_loss_eur != null || data.stop_loss_usd != null;
    if (!hasStop) {
      warnings.push({
        rule: 'MISSING_STOP_LOSS',
        asset,
        detail: `${asset} has no stop-loss defined in portfolio.json`,
      });
    }
  }

  return { violations, warnings, balance, cashPct, highRiskPct };
}

function format(result, json = false) {
  if (json) return JSON.stringify(result, null, 2);

  const lines = [];
  lines.push('=== MakeMeRich Rules Validation ===');
  lines.push(`Balance: EUR ${result.balance.toFixed(2)}`);
  lines.push(`Cash: ${result.cashPct.toFixed(1)}%`);
  lines.push(`High-risk: ${result.highRiskPct.toFixed(1)}%`);
  lines.push('');

  if (result.violations.length === 0 && result.warnings.length === 0) {
    lines.push('PASS — All rules satisfied');
    return lines.join('\n');
  }

  if (result.violations.length > 0) {
    lines.push(`VIOLATIONS (${result.violations.length}):`);
    for (const v of result.violations) {
      lines.push(`  [${v.rule}] ${v.detail}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push(`WARNINGS (${result.warnings.length}):`);
    for (const w of result.warnings) {
      lines.push(`  [${w.rule}] ${w.detail}`);
    }
  }

  return lines.join('\n');
}

// Main
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

try {
  const portfolio = loadPortfolio();
  const result = validate(portfolio);
  console.log(format(result, jsonOutput));
  process.exit(result.violations.length > 0 ? 1 : 0);
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(2);
}
