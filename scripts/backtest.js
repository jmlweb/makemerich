#!/usr/bin/env node
/**
 * MakeMeRich - Strategy Backtester
 *
 * Tests quantitative signal rules against historical OHLCV data.
 * Simulates trades with realistic fees and compares against buy-and-hold.
 *
 * Requires: data/history/{SYMBOL}.json (run fetch-history.js first)
 *
 * Usage:
 *   node scripts/backtest.js --symbol ETH [--period 6mo] [--json]
 *   node scripts/backtest.js --all [--period 6mo] [--json]
 */

const fs = require('fs');
const path = require('path');
const { sma, rsi, macd, bollingerBands, atr } = require('./indicators');

const HISTORY_DIR = path.join(__dirname, '..', 'data', 'history');
const PORTFOLIO_PATH = path.join(__dirname, '..', 'data', 'portfolio.json');

// Fee structure (from RULES.md)
const FEES = {
  ETF: 0.001,    // 0.1%
  ETC: 0.001,    // 0.1%
  Crypto: 0.005, // 0.5%
};

// Asset type classification
const ASSET_TYPES = {
  BTC: 'Crypto', ETH: 'Crypto', SOL: 'Crypto',
  '4GLD': 'ETC', SGLD: 'ETC',
  // Everything else defaults to ETF
};

const THRESHOLDS = {
  BUY: 20,
  SELL: -20,
};

const WEIGHTS = {
  trend: 0.25,
  momentum: 0.25,
  meanReversion: 0.20,
  macd: 0.15,
  volatility: 0.15,
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    symbol: args.find((_, i) => args[i - 1] === '--symbol') || null,
    all: args.includes('--all'),
    period: args.find((_, i) => args[i - 1] === '--period') || null,
    json: args.includes('--json'),
  };
}

function loadHistory(symbol) {
  const filePath = path.join(HISTORY_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getFeeRate(symbol) {
  return FEES[ASSET_TYPES[symbol] || 'ETF'];
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Compute composite signal score at a given index
 */
function computeSignalAtIndex(closes, highs, lows, idx, precomputed) {
  const {
    sma20Arr, sma50Arr, sma200Arr, rsi14Arr,
    macdHist, bbUpper, bbLower, atr14Arr,
  } = precomputed;

  const price = closes[idx];
  let compositeScore = 0;
  let validWeightSum = 0;

  // 1. Trend
  if (sma50Arr[idx] !== null && sma20Arr[idx] !== null) {
    let score = 0;
    if (sma200Arr[idx] !== null) {
      score += sma50Arr[idx] > sma200Arr[idx] ? 40 : -40;
    }
    score += price > sma20Arr[idx] ? 20 : -20;
    if (sma200Arr[idx] !== null) {
      if (price > sma50Arr[idx] && price > sma200Arr[idx]) score += 20;
      else if (price < sma50Arr[idx] && price < sma200Arr[idx]) score -= 20;
    }
    compositeScore += clamp(score, -100, 100) * WEIGHTS.trend;
    validWeightSum += WEIGHTS.trend;
  }

  // 2. RSI Momentum
  if (rsi14Arr[idx] !== null) {
    let score = 0;
    if (rsi14Arr[idx] < 30) {
      score = 60;
      if (sma200Arr[idx] !== null && price > sma200Arr[idx]) score = 80;
    } else if (rsi14Arr[idx] > 70) {
      score = -60;
      if (sma20Arr[idx] !== null && price < sma20Arr[idx]) score = -80;
    } else if (rsi14Arr[idx] < 40) score = 20;
    else if (rsi14Arr[idx] > 60) score = -20;
    compositeScore += clamp(score, -100, 100) * WEIGHTS.momentum;
    validWeightSum += WEIGHTS.momentum;
  }

  // 3. Mean Reversion
  if (bbLower[idx] !== null && rsi14Arr[idx] !== null) {
    let score = 0;
    if (price <= bbLower[idx] && rsi14Arr[idx] < 35) score = 70;
    else if (price >= bbUpper[idx] && rsi14Arr[idx] > 65) score = -70;
    else if (price <= bbLower[idx]) score = 30;
    else if (price >= bbUpper[idx]) score = -30;
    compositeScore += clamp(score, -100, 100) * WEIGHTS.meanReversion;
    validWeightSum += WEIGHTS.meanReversion;
  }

  // 4. MACD
  if (macdHist[idx] !== null) {
    let score = 0;
    const prev = idx > 0 ? macdHist[idx - 1] : null;
    if (prev !== null && prev < 0 && macdHist[idx] >= 0) score = 60;
    else if (prev !== null && prev > 0 && macdHist[idx] <= 0) score = -60;
    else if (macdHist[idx] > 0) score = 20;
    else score = -20;
    compositeScore += clamp(score, -100, 100) * WEIGHTS.macd;
    validWeightSum += WEIGHTS.macd;
  }

  // 5. Volatility (ATR)
  if (atr14Arr[idx] !== null && idx >= 10 && atr14Arr[idx - 10] !== null) {
    const atrChange = (atr14Arr[idx] - atr14Arr[idx - 10]) / atr14Arr[idx - 10];
    let score = 0;
    if (atrChange < -0.15) score = 30;
    else if (atrChange > 0.30) score = -30;
    compositeScore += score * WEIGHTS.volatility;
    validWeightSum += WEIGHTS.volatility;
  }

  if (validWeightSum === 0) return 0;
  return Math.round(clamp(compositeScore / validWeightSum, -100, 100));
}

function runBacktest(symbol, historyData, periodDays) {
  const data = historyData.data;
  const startIdx = periodDays ? Math.max(0, data.length - periodDays) : 0;
  // Need at least 200 days of lookback for SMA200
  const lookbackStart = Math.max(0, startIdx - 200);

  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  // Precompute all indicators over full history
  const precomputed = {
    sma20Arr: sma(closes, 20),
    sma50Arr: sma(closes, 50),
    sma200Arr: sma(closes, 200),
    rsi14Arr: rsi(closes, 14),
    macdHist: macd(closes, 12, 26, 9).histogram,
    bbUpper: bollingerBands(closes, 20, 2).upper,
    bbLower: bollingerBands(closes, 20, 2).lower,
    atr14Arr: atr(highs, lows, closes, 14),
  };

  const feeRate = getFeeRate(symbol);
  const trades = [];
  let position = null; // { entryPrice, entryDate, entryIdx }
  let cash = 10000; // Normalized starting capital
  let units = 0;

  // Walk through trading period
  for (let i = Math.max(startIdx, 50); i < data.length; i++) {
    const score = computeSignalAtIndex(closes, highs, lows, i, precomputed);
    const price = closes[i];
    const date = data[i].date;

    if (!position && score >= THRESHOLDS.BUY) {
      // BUY: enter position
      const fee = cash * feeRate;
      units = (cash - fee) / price;
      position = { entryPrice: price, entryDate: date, entryIdx: i };
      cash = 0;
    } else if (position && score <= THRESHOLDS.SELL) {
      // SELL: exit position
      const grossValue = units * price;
      const fee = grossValue * feeRate;
      cash = grossValue - fee;

      const returnPct = ((price - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entry: position.entryDate,
        exit: date,
        entryPrice: +position.entryPrice.toFixed(4),
        exitPrice: +price.toFixed(4),
        holdingDays: i - position.entryIdx,
        returnPct: +returnPct.toFixed(2),
        netReturnPct: +(((cash - 10000) / 10000) * 100).toFixed(2),
      });

      position = null;
      units = 0;
      cash = cash; // Reset base for next trade: keep running total
    }
  }

  // If still in position, mark-to-market
  const lastPrice = closes[closes.length - 1];
  let openPosition = null;
  if (position) {
    const grossValue = units * lastPrice;
    const fee = grossValue * feeRate;
    cash = grossValue - fee;
    const returnPct = ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
    openPosition = {
      entry: position.entryDate,
      entryPrice: +position.entryPrice.toFixed(4),
      currentPrice: +lastPrice.toFixed(4),
      holdingDays: data.length - 1 - position.entryIdx,
      returnPct: +returnPct.toFixed(2),
      status: 'OPEN',
    };
  }

  const totalReturn = ((cash - 10000) / 10000) * 100;

  // Buy-and-hold benchmark
  const benchStart = closes[Math.max(startIdx, 50)];
  const benchEnd = lastPrice;
  const benchFees = feeRate * 2; // Buy + sell
  const benchReturn = ((benchEnd - benchStart) / benchStart) * 100 - benchFees * 100;

  // Calculate max drawdown of strategy
  let peak = 10000;
  let maxDrawdown = 0;
  let equity = 10000;
  let tradeIdx = 0;

  for (let i = Math.max(startIdx, 50); i < data.length; i++) {
    if (tradeIdx < trades.length) {
      const t = trades[tradeIdx];
      if (data[i].date === t.exit) {
        equity = 10000 * (1 + t.netReturnPct / 100);
        tradeIdx++;
      }
    }
    if (equity > peak) peak = equity;
    const dd = ((peak - equity) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const wins = trades.filter((t) => t.returnPct > 0).length;

  // Sharpe ratio (annualized, simplified)
  const returns = trades.map((t) => t.returnPct);
  let sharpe = null;
  if (returns.length >= 2) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      const avgHoldingDays = trades.reduce((a, t) => a + t.holdingDays, 0) / trades.length;
      const tradesPerYear = 252 / avgHoldingDays;
      sharpe = +((mean / stdDev) * Math.sqrt(tradesPerYear)).toFixed(2);
    }
  }

  return {
    symbol,
    currency: historyData.currency,
    period: `${data[Math.max(startIdx, 50)].date} to ${data[data.length - 1].date}`,
    dataPoints: data.length - Math.max(startIdx, 50),
    strategy: {
      trades: trades.length,
      wins,
      losses: trades.length - wins,
      winRate: trades.length > 0 ? +((wins / trades.length) * 100).toFixed(1) : 0,
      totalReturn: +totalReturn.toFixed(2),
      maxDrawdown: +maxDrawdown.toFixed(2),
      sharpeRatio: sharpe,
      avgHoldingDays: trades.length > 0
        ? Math.round(trades.reduce((a, t) => a + t.holdingDays, 0) / trades.length)
        : 0,
    },
    benchmark: {
      buyAndHold: +benchReturn.toFixed(2),
    },
    trades,
    openPosition,
  };
}

function parsePeriod(periodStr) {
  if (!periodStr) return null;
  const match = periodStr.match(/^(\d+)(d|mo|y)$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  switch (match[2]) {
    case 'd': return num;
    case 'mo': return num * 30;
    case 'y': return num * 365;
    default: return null;
  }
}

function formatResult(result) {
  const lines = [];
  lines.push(`=== Backtest: ${result.symbol} ===`);
  lines.push(`Period: ${result.period} (${result.dataPoints} trading days)`);
  lines.push('');
  lines.push('Strategy:');
  lines.push(`  Trades:        ${result.strategy.trades}`);
  lines.push(`  Win rate:      ${result.strategy.winRate}% (${result.strategy.wins}W / ${result.strategy.losses}L)`);
  lines.push(`  Total return:  ${result.strategy.totalReturn >= 0 ? '+' : ''}${result.strategy.totalReturn}%`);
  lines.push(`  Max drawdown:  -${result.strategy.maxDrawdown}%`);
  lines.push(`  Sharpe ratio:  ${result.strategy.sharpeRatio ?? 'N/A'}`);
  lines.push(`  Avg holding:   ${result.strategy.avgHoldingDays} days`);
  lines.push('');
  lines.push('Benchmark (buy & hold):');
  lines.push(`  Total return:  ${result.benchmark.buyAndHold >= 0 ? '+' : ''}${result.benchmark.buyAndHold}%`);
  lines.push('');

  const diff = result.strategy.totalReturn - result.benchmark.buyAndHold;
  lines.push(`Alpha: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}% vs buy-and-hold`);

  if (result.trades.length > 0 || result.openPosition) {
    lines.push('');
    lines.push('Trades:');
    for (const t of result.trades) {
      lines.push(`  ${t.entry} → ${t.exit} | ${t.entryPrice} → ${t.exitPrice} | ${t.returnPct >= 0 ? '+' : ''}${t.returnPct}% (${t.holdingDays}d)`);
    }
    if (result.openPosition) {
      const op = result.openPosition;
      lines.push(`  ${op.entry} → OPEN  | ${op.entryPrice} → ${op.currentPrice} | ${op.returnPct >= 0 ? '+' : ''}${op.returnPct}% (${op.holdingDays}d) *still held*`);
    }
  }

  return lines.join('\n');
}

function main() {
  const { symbol, all, period, json } = parseArgs();
  const periodDays = parsePeriod(period);

  if (!symbol && !all) {
    console.error('Usage: node scripts/backtest.js --symbol ETH [--period 6mo]');
    console.error('       node scripts/backtest.js --all [--period 6mo]');
    process.exit(1);
  }

  let symbols = [];
  if (all) {
    // All symbols with history data
    if (fs.existsSync(HISTORY_DIR)) {
      symbols = fs.readdirSync(HISTORY_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .filter((s) => !['SP500', 'VIX'].includes(s)); // Skip indices
    }
  } else {
    symbols = [symbol];
  }

  const results = [];

  for (const sym of symbols) {
    const history = loadHistory(sym);
    if (!history) {
      console.error(`No history for ${sym}. Run fetch-history.js first.`);
      continue;
    }

    if (history.data.length < 60) {
      console.error(`${sym}: insufficient data (${history.data.length} days, need 60+)`);
      continue;
    }

    const result = runBacktest(sym, history, periodDays);
    results.push(result);

    if (!json) {
      console.log(formatResult(result));
      console.log('');
    }
  }

  if (json) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  }

  // Summary for --all
  if (all && !json && results.length > 1) {
    console.log('=== Summary ===');
    console.log('Symbol'.padEnd(8) + 'Return'.padStart(10) + 'B&H'.padStart(10) + 'Alpha'.padStart(10) + 'WinRate'.padStart(10) + 'Trades'.padStart(8));
    for (const r of results) {
      const alpha = r.strategy.totalReturn - r.benchmark.buyAndHold;
      console.log(
        r.symbol.padEnd(8) +
        `${r.strategy.totalReturn}%`.padStart(10) +
        `${r.benchmark.buyAndHold}%`.padStart(10) +
        `${alpha >= 0 ? '+' : ''}${alpha.toFixed(1)}%`.padStart(10) +
        `${r.strategy.winRate}%`.padStart(10) +
        String(r.strategy.trades).padStart(8)
      );
    }
  }
}

try {
  main();
} catch (e) {
  console.error('Error: ' + e.message);
  process.exit(1);
}
