#!/usr/bin/env node
/**
 * MakeMeRich - Signal Executor
 *
 * Reads quantitative signals and portfolio state, produces binding trade
 * recommendations with exact amounts. The agent executes these mechanically.
 *
 * This script does NOT modify portfolio.json — it outputs orders that the
 * agent (or human) must execute and record.
 *
 * Usage:
 *   node scripts/execute-signals.js [--json] [--dry-run]
 *
 * Output: data/.trade-orders.json + human-readable summary
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');
const QUANT_PATH = path.join(DATA_DIR, '.quant-signals-latest.json');
const PRICES_PATH = path.join(DATA_DIR, '.prices-latest.json');
const OUTPUT_PATH = path.join(DATA_DIR, '.trade-orders.json');

// Position limits (from RULES.md — these are absolute, no overrides)
const LIMITS = {
  MAX_SINGLE_POSITION: 0.50,  // 50% of portfolio
  MIN_CASH_RESERVE: 0.05,     // 5% minimum cash
  MAX_HIGH_RISK: 0.30,        // 30% in high-risk assets
  MAX_INVERSE_LEVERAGED: 0.15, // 15% in inverse/leveraged
  MAX_RISK_PER_TRADE: 0.02,   // 2% risk per trade
};

// Fee structure
const FEES = {
  ETF: 0.001,
  ETC: 0.001,
  Crypto: 0.005,
};

// Asset classifications
const ASSET_META = {
  BTC: { type: 'Crypto', risk: 'high' },
  ETH: { type: 'Crypto', risk: 'high' },
  SOL: { type: 'Crypto', risk: 'high' },
  '4GLD': { type: 'ETC', risk: 'medium' },
  SGLD: { type: 'ETC', risk: 'medium' },
  XEON: { type: 'ETF', risk: 'low' },
  DXS3: { type: 'ETF', risk: 'high', inverse: true, leveraged: true },
  NATO: { type: 'ETF', risk: 'high' },
  VWCE: { type: 'ETF', risk: 'medium' },
  SXR8: { type: 'ETF', risk: 'medium' },
  EQQQ: { type: 'ETF', risk: 'medium' },
  CSPX: { type: 'ETF', risk: 'medium' },
  EUNL: { type: 'ETF', risk: 'medium' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
  };
}

function load(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getFeeRate(symbol) {
  const meta = ASSET_META[symbol];
  if (!meta) return FEES.ETF;
  return FEES[meta.type] || FEES.ETF;
}

function isHighRisk(symbol) {
  return ASSET_META[symbol]?.risk === 'high';
}

function isInverse(symbol) {
  return ASSET_META[symbol]?.inverse === true;
}

function computePortfolioState(portfolio) {
  const holdings = portfolio.holdings;
  const balance = portfolio.totals.balance_eur;

  let cashValue = holdings.CASH?.amount_eur || 0;
  let highRiskValue = 0;
  let inverseValue = 0;
  const positions = {};

  for (const [asset, data] of Object.entries(holdings)) {
    if (asset === 'CASH') continue;
    const value = data.amount_eur || 0;
    positions[asset] = { value, pct: value / balance };
    if (isHighRisk(asset)) highRiskValue += value;
    if (isInverse(asset)) inverseValue += value;
  }

  return {
    balance,
    cashValue,
    cashPct: cashValue / balance,
    highRiskValue,
    highRiskPct: highRiskValue / balance,
    inverseValue,
    inversePct: inverseValue / balance,
    positions,
  };
}

function generateOrders(portfolio, signals) {
  const state = computePortfolioState(portfolio);
  const orders = [];
  const warnings = [];

  // Check portfolio-level constraints
  if (state.inversePct > LIMITS.MAX_INVERSE_LEVERAGED) {
    warnings.push(
      `Inverse/leveraged at ${(state.inversePct * 100).toFixed(1)}% (limit: ${LIMITS.MAX_INVERSE_LEVERAGED * 100}%). Reduce inverse positions.`
    );
  }

  if (state.highRiskPct > LIMITS.MAX_HIGH_RISK) {
    warnings.push(
      `High-risk assets at ${(state.highRiskPct * 100).toFixed(1)}% (limit: ${LIMITS.MAX_HIGH_RISK * 100}%). Reduce high-risk positions.`
    );
  }

  // Process each asset's signal
  for (const [symbol, data] of Object.entries(signals.assets)) {
    if (data.error) continue;
    const signal = data.composite?.signal;
    if (!signal) continue;

    const currentPosition = state.positions[symbol];
    const hasPosition = currentPosition && currentPosition.value > 0;
    const feeRate = getFeeRate(symbol);

    // --- SELL signals ---
    if ((signal === 'SELL' || signal === 'STRONG_SELL') && hasPosition) {
      const sellPct = signal === 'STRONG_SELL' ? 1.0 : 0.5;
      const sellValue = currentPosition.value * sellPct;
      const fee = sellValue * feeRate;

      orders.push({
        action: 'SELL',
        symbol,
        signal,
        score: data.composite.score,
        sellPct: sellPct * 100,
        estimatedValueEur: +sellValue.toFixed(2),
        estimatedFeeEur: +fee.toFixed(2),
        reason: summarizeSignals(data.signals),
        priority: signal === 'STRONG_SELL' ? 'HIGH' : 'MEDIUM',
      });
    }

    // --- BUY signals ---
    if ((signal === 'BUY' || signal === 'STRONG_BUY') && !hasPosition) {
      // Check if we can buy (cash available, limits respected)
      const availableCash = state.cashValue - state.balance * LIMITS.MIN_CASH_RESERVE;
      if (availableCash <= 0) {
        warnings.push(`${symbol}: BUY signal but insufficient cash (${state.cashValue.toFixed(0)} EUR, need ${(state.balance * LIMITS.MIN_CASH_RESERVE).toFixed(0)} EUR reserve)`);
        continue;
      }

      // Position sizing via ATR (from quant signals)
      let buyAmount;
      if (data.positionSizing) {
        const riskAmount = state.balance * LIMITS.MAX_RISK_PER_TRADE;
        const stopDistancePct = data.positionSizing.stopDistancePct / 100;
        buyAmount = Math.min(riskAmount / stopDistancePct, availableCash);
      } else {
        // Fallback: fixed 10% of portfolio
        buyAmount = Math.min(state.balance * 0.10, availableCash);
      }

      // Enforce position limits
      const maxPosition = state.balance * LIMITS.MAX_SINGLE_POSITION;
      buyAmount = Math.min(buyAmount, maxPosition);

      // Enforce high-risk limits
      if (isHighRisk(symbol)) {
        const highRiskRoom = state.balance * LIMITS.MAX_HIGH_RISK - state.highRiskValue;
        if (highRiskRoom <= 0) {
          warnings.push(`${symbol}: BUY signal but high-risk limit reached (${(state.highRiskPct * 100).toFixed(1)}%)`);
          continue;
        }
        buyAmount = Math.min(buyAmount, highRiskRoom);
      }

      // Enforce inverse/leveraged limits
      if (isInverse(symbol)) {
        const inverseRoom = state.balance * LIMITS.MAX_INVERSE_LEVERAGED - state.inverseValue;
        if (inverseRoom <= 0) {
          warnings.push(`${symbol}: BUY signal but inverse/leveraged limit reached (${(state.inversePct * 100).toFixed(1)}%)`);
          continue;
        }
        buyAmount = Math.min(buyAmount, inverseRoom);
      }

      if (buyAmount < 50) {
        warnings.push(`${symbol}: BUY signal but position too small (${buyAmount.toFixed(0)} EUR)`);
        continue;
      }

      const fee = buyAmount * feeRate;

      orders.push({
        action: 'BUY',
        symbol,
        signal,
        score: data.composite.score,
        estimatedValueEur: +buyAmount.toFixed(2),
        estimatedFeeEur: +fee.toFixed(2),
        stopPrice: data.positionSizing?.stopPrice || null,
        stopDistancePct: data.positionSizing?.stopDistancePct || null,
        reason: summarizeSignals(data.signals),
        priority: signal === 'STRONG_BUY' ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  // --- Limit violation corrections ---

  // If inverse position exceeds limit, generate SELL order to bring it within limits
  if (state.inversePct > LIMITS.MAX_INVERSE_LEVERAGED) {
    for (const [symbol, pos] of Object.entries(state.positions)) {
      if (!isInverse(symbol)) continue;
      const excess = state.inverseValue - state.balance * LIMITS.MAX_INVERSE_LEVERAGED;
      if (excess > 0) {
        const alreadyOrdered = orders.find((o) => o.symbol === symbol && o.action === 'SELL');
        if (!alreadyOrdered) {
          orders.push({
            action: 'SELL',
            symbol,
            signal: 'LIMIT_VIOLATION',
            score: 0,
            sellPct: +((excess / pos.value) * 100).toFixed(1),
            estimatedValueEur: +excess.toFixed(2),
            estimatedFeeEur: +(excess * getFeeRate(symbol)).toFixed(2),
            reason: `Inverse position at ${(state.inversePct * 100).toFixed(1)}%, limit is ${LIMITS.MAX_INVERSE_LEVERAGED * 100}%`,
            priority: 'HIGH',
          });
        }
      }
    }
  }

  // If high-risk allocation exceeds limit, generate SELL orders for high-risk positions
  // Priority: sell the largest high-risk position first (excluding any with active BUY signal)
  if (state.highRiskPct > LIMITS.MAX_HIGH_RISK) {
    let excess = state.highRiskValue - state.balance * LIMITS.MAX_HIGH_RISK;

    // Sort high-risk positions by value (largest first)
    const highRiskPositions = Object.entries(state.positions)
      .filter(([symbol]) => isHighRisk(symbol))
      .sort((a, b) => b[1].value - a[1].value);

    for (const [symbol, pos] of highRiskPositions) {
      if (excess <= 0) break;
      const alreadyOrdered = orders.find((o) => o.symbol === symbol && o.action === 'SELL');
      if (alreadyOrdered) {
        excess -= alreadyOrdered.estimatedValueEur;
        continue;
      }

      const sellAmount = Math.min(excess, pos.value * 0.5); // Max 50% per order
      if (sellAmount < 50) continue; // Skip tiny orders

      orders.push({
        action: 'SELL',
        symbol,
        signal: 'LIMIT_VIOLATION',
        score: 0,
        sellPct: +((sellAmount / pos.value) * 100).toFixed(1),
        estimatedValueEur: +sellAmount.toFixed(2),
        estimatedFeeEur: +(sellAmount * getFeeRate(symbol)).toFixed(2),
        reason: `High-risk at ${(state.highRiskPct * 100).toFixed(1)}%, limit is ${LIMITS.MAX_HIGH_RISK * 100}%. Reducing ${symbol} (largest high-risk position)`,
        priority: 'HIGH',
      });

      excess -= sellAmount;
    }
  }

  // Sort: HIGH priority first, then SELL before BUY
  orders.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'HIGH' ? -1 : 1;
    if (a.action !== b.action) return a.action === 'SELL' ? -1 : 1;
    return 0;
  });

  return { orders, warnings };
}

function summarizeSignals(signals) {
  return Object.entries(signals)
    .filter(([, s]) => Math.abs(s.score) >= 20)
    .map(([key, s]) => `${key}: ${s.detail}`)
    .join('; ');
}

function formatOutput(result) {
  const lines = [];
  lines.push('=== MakeMeRich Trade Orders ===');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push('');

  if (result.warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const w of result.warnings) lines.push(`  ! ${w}`);
    lines.push('');
  }

  if (result.orders.length === 0) {
    lines.push('NO ORDERS — All signals are HOLD. Do nothing.');
    return lines.join('\n');
  }

  lines.push(`ORDERS (${result.orders.length}):`);
  lines.push('');

  for (const order of result.orders) {
    const icon = order.action === 'BUY' ? 'BUY ' : 'SELL';
    const prio = order.priority === 'HIGH' ? '!!!' : '   ';
    lines.push(`${prio} ${icon} ${order.symbol}`);
    lines.push(`    Signal: ${order.signal} (score: ${order.score})`);
    lines.push(`    Amount: EUR ${order.estimatedValueEur} (fee: EUR ${order.estimatedFeeEur})`);
    if (order.sellPct) lines.push(`    Sell %: ${order.sellPct}%`);
    if (order.stopPrice) lines.push(`    Stop: ${order.stopPrice} (${order.stopDistancePct}% away)`);
    lines.push(`    Reason: ${order.reason}`);
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const { json, dryRun } = parseArgs();

  const portfolio = load(PORTFOLIO_PATH);
  if (!portfolio) {
    console.error('Error: portfolio.json not found');
    process.exit(1);
  }

  const signals = load(QUANT_PATH);
  if (!signals) {
    console.error('Error: .quant-signals-latest.json not found. Run generate-quant-signals.js first.');
    process.exit(1);
  }

  const { orders, warnings } = generateOrders(portfolio, signals);

  const result = {
    generatedAt: new Date().toISOString(),
    portfolioBalance: portfolio.totals.balance_eur,
    orders,
    warnings,
    summary: {
      totalBuyEur: orders.filter((o) => o.action === 'BUY').reduce((s, o) => s + o.estimatedValueEur, 0),
      totalSellEur: orders.filter((o) => o.action === 'SELL').reduce((s, o) => s + o.estimatedValueEur, 0),
      orderCount: orders.length,
    },
  };

  if (!dryRun) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatOutput(result));
  }
}

try {
  main();
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(1);
}
