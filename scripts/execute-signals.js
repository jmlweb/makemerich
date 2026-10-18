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
const TRADES_DIR = path.join(DATA_DIR, 'trades');
const ALIASES_PATH = path.join(DATA_DIR, '.ticker-aliases.json');

// Position limits (from RULES.md — these are absolute, no overrides)
const LIMITS = {
  MAX_SINGLE_POSITION: 0.50,  // 50% of portfolio
  MIN_CASH_RESERVE: 0.05,     // 5% minimum cash
  MAX_HIGH_RISK: 0.30,        // 30% in high-risk assets
  MAX_INVERSE_LEVERAGED: 0.15, // 15% in inverse/leveraged
  MAX_RISK_PER_TRADE: 0.02,   // 2% risk per trade
};

// Drift above MAX_SINGLE_POSITION is trimmed back to this level, not to exactly
// 50%, so ordinary price drift does not trigger a new trim every session.
const SINGLE_POSITION_TRIM_TARGET = 0.48;
const MIN_ORDER_EUR = 50;

// No re-entry into an asset sold within this window (LEARNINGS.md 2026-03-18;
// AIR was re-bought 24h after a stop-out and stopped out again — FINDINGS.md 2026-10-18 A6).
const REENTRY_COOLDOWN_HOURS = 48;

// Holdings worth less than this are leftovers of partial sells, sold off in full.
const DUST_EUR = 1;

// Fee structure (Bitpanda: 0.1% all asset classes)
const FEES = {
  ETF: 0.001,
  ETC: 0.001,
  Stock: 0.001,
  Crypto: 0.001,
};

// Asset classifications
const ASSET_META = {
  BTC: { type: 'Crypto', risk: 'high' },
  ETH: { type: 'Crypto', risk: 'high' },
  SOL: { type: 'Crypto', risk: 'high' },
  '4GLD': { type: 'ETC', risk: 'medium', defensive: true },
  SGLD: { type: 'ETC', risk: 'medium' },
  XEON: { type: 'ETF', risk: 'low', defensive: true },
  DXS3: { type: 'ETF', risk: 'high', inverse: true, leveraged: true },
  NATO: { type: 'ETF', risk: 'high' },
  VWCE: { type: 'ETF', risk: 'medium' },
  SXR8: { type: 'ETF', risk: 'medium' },
  EQQQ: { type: 'ETF', risk: 'medium' },
  CSPX: { type: 'ETF', risk: 'medium' },
  EUNL: { type: 'ETF', risk: 'medium' },
  // EU Stocks (blue chips — medium risk, 0.1% fee)
  SAP: { type: 'Stock', risk: 'medium' },
  ASML: { type: 'Stock', risk: 'medium' },
  MC: { type: 'Stock', risk: 'medium' },
  ITX: { type: 'Stock', risk: 'medium' },
  SIE: { type: 'Stock', risk: 'medium' },
  AIR: { type: 'Stock', risk: 'medium' },
  NOVO: { type: 'Stock', risk: 'medium' },
  ALV: { type: 'Stock', risk: 'medium' },
  TTE: { type: 'Stock', risk: 'medium' },
  DTE: { type: 'Stock', risk: 'medium' },
};

function isDefensive(symbol) {
  return ASSET_META[symbol]?.defensive === true;
}

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

// Last SELL time per canonical ticker, from this month's and last month's trade
// logs (so a sale on the 30th still blocks a BUY on the 1st). Includes
// stop-loss sells, which are logged by stoploss-watch.sh.
function loadLastSellTimes(now = new Date()) {
  const aliases = fs.existsSync(ALIASES_PATH) ? load(ALIASES_PATH).resolve || {} : {};
  const monthKey = (d) => d.toISOString().slice(0, 7);
  const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastSell = {};

  for (const month of [monthKey(previousMonth), monthKey(now)]) {
    const file = path.join(TRADES_DIR, `${month}.json`);
    if (!fs.existsSync(file)) continue;
    for (const trade of load(file)) {
      if (trade.action !== 'SELL') continue;
      const ticker = aliases[trade.asset] || trade.asset;
      const soldAt = new Date(`${trade.date}T${(trade.time || '00:00').slice(0, 5)}:00Z`);
      if (!lastSell[ticker] || soldAt > lastSell[ticker]) lastSell[ticker] = soldAt;
    }
  }
  return lastSell;
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
  const lastSellTimes = loadLastSellTimes();
  const orders = [];
  const warnings = [];

  // Clear dust left by earlier partial sells, through a recorded SELL
  for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
    if (symbol === 'CASH' || !(holding.units > 0) || (holding.amount_eur || 0) >= DUST_EUR) continue;
    orders.push({
      action: 'SELL',
      symbol,
      signal: 'DUST_CLEANUP',
      score: 0,
      sellPct: 100,
      estimatedValueEur: +(holding.amount_eur || 0).toFixed(2),
      estimatedFeeEur: 0,
      reason: `Dust cleanup: ${holding.units} units worth EUR ${(holding.amount_eur || 0).toFixed(2)} left by partial sells`,
      priority: 'MEDIUM',
    });
  }

  // Get market regime
  const regime = signals.marketRegime?.regime || 'unknown';

  // Check portfolio-level constraints
  if (state.inversePct > LIMITS.MAX_INVERSE_LEVERAGED + 0.001) {
    warnings.push(
      `Inverse/leveraged at ${(state.inversePct * 100).toFixed(1)}% (limit: ${LIMITS.MAX_INVERSE_LEVERAGED * 100}%). Reduce inverse positions.`
    );
  }

  if (state.highRiskPct > LIMITS.MAX_HIGH_RISK + 0.001) {
    warnings.push(
      `High-risk assets at ${(state.highRiskPct * 100).toFixed(1)}% (limit: ${LIMITS.MAX_HIGH_RISK * 100}%). Reduce high-risk positions.`
    );
  }

  if (regime !== 'unknown') {
    warnings.push(`Market Regime: ${regime.toUpperCase()}`);
  }

  // Track cash spent on BUY orders to avoid over-committing
  let cashSpent = 0;

  // Process each asset's signal
  for (const [symbol, data] of Object.entries(signals.assets)) {
    if (data.error) continue;
    const signal = data.composite?.signal;
    const score = data.composite?.score || 0;
    if (!signal) continue;

    const currentPosition = state.positions[symbol];
    const hasPosition = currentPosition && currentPosition.value > 0;
    const feeRate = getFeeRate(symbol);

    // --- SELL signals ---
    const alreadySelling = orders.some((o) => o.symbol === symbol && o.action === 'SELL');
    if ((signal === 'SELL' || signal === 'STRONG_SELL') && hasPosition && !alreadySelling) {
      // A 50% sell that would leave less than a minimum order exits fully, so
      // repeated SELL signals don't halve a position down to dust (A7).
      const halfLeavesDust = currentPosition.value * 0.5 < MIN_ORDER_EUR;
      const sellPct = signal === 'STRONG_SELL' || halfLeavesDust ? 1.0 : 0.5;
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

    // --- BUY signals (regime-gated) ---
    // Regime filters:
    // - crisis: block all except XEON
    // - risk-off: STRONG_BUY only (score >= 50), defensive assets only (XEON, 4GLD)
    // - risk-on: normal (score >= 20 for BUY, >= 50 for STRONG_BUY)
    if ((signal === 'BUY' || signal === 'STRONG_BUY') && !hasPosition) {
      let blocked = false;
      let blockReason = '';

      if (regime === 'crisis' && symbol !== 'XEON') {
        blocked = true;
        blockReason = 'CRISIS: BUY blocked for non-XEON';
      } else if (regime === 'risk-off') {
        if (score < 50) {
          blocked = true;
          blockReason = 'RISK-OFF: need STRONG_BUY (score >= 50)';
        } else if (!isDefensive(symbol)) {
          blocked = true;
          blockReason = 'RISK-OFF: defensive assets only (XEON, 4GLD)';
        }
      }

      if (blocked) {
        warnings.push(`${symbol}: ${blockReason} (${signal}, score: ${score})`);
        continue;
      }

      const lastSell = lastSellTimes[symbol];
      const hoursSinceSell = lastSell ? (Date.now() - lastSell.getTime()) / 3600000 : Infinity;
      if (hoursSinceSell < REENTRY_COOLDOWN_HOURS) {
        warnings.push(`${symbol}: BUY blocked — sold ${hoursSinceSell.toFixed(0)}h ago, cooldown ${REENTRY_COOLDOWN_HOURS}h (${signal}, score: ${score})`);
        continue;
      }
      // Check if we can buy (cash available, limits respected)
      const availableCash = state.cashValue - cashSpent - state.balance * LIMITS.MIN_CASH_RESERVE;
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

      if (buyAmount < MIN_ORDER_EUR) {
        warnings.push(`${symbol}: BUY signal but position too small (${buyAmount.toFixed(0)} EUR)`);
        continue;
      }

      const fee = buyAmount * feeRate;

      cashSpent += buyAmount + fee;

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
  if (state.inversePct > LIMITS.MAX_INVERSE_LEVERAGED + 0.001) {
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
  if (state.highRiskPct > LIMITS.MAX_HIGH_RISK + 0.001) {
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

  // A position that grew past MAX_SINGLE_POSITION after entry is trimmed back.
  // Entry-time caps alone let EQQQ sit above 50% for 99 days (FINDINGS.md 2026-10-18 A2).
  for (const [symbol, pos] of Object.entries(state.positions)) {
    if (pos.pct <= LIMITS.MAX_SINGLE_POSITION + 0.001) continue;
    if (orders.find((o) => o.symbol === symbol && o.action === 'SELL')) continue;

    const sellAmount = pos.value - state.balance * SINGLE_POSITION_TRIM_TARGET;
    if (sellAmount < MIN_ORDER_EUR) continue;

    orders.push({
      action: 'SELL',
      symbol,
      signal: 'LIMIT_VIOLATION',
      score: 0,
      sellPct: +((sellAmount / pos.value) * 100).toFixed(1),
      estimatedValueEur: +sellAmount.toFixed(2),
      estimatedFeeEur: +(sellAmount * getFeeRate(symbol)).toFixed(2),
      reason: `Single position at ${(pos.pct * 100).toFixed(1)}%, limit is ${LIMITS.MAX_SINGLE_POSITION * 100}%. Trimming ${symbol} to ${SINGLE_POSITION_TRIM_TARGET * 100}%`,
      priority: 'HIGH',
    });
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
