#!/usr/bin/env node
/**
 * MakeMeRich - Quantitative Signal Generator
 *
 * Computes BUY/SELL/HOLD signals from technical indicators applied to
 * historical OHLCV data. Replaces narrative-based decisions with rule-based
 * composite scores.
 *
 * Requires: data/history/{SYMBOL}.json (run fetch-history.js first)
 *
 * Usage:
 *   node scripts/generate-quant-signals.js [--json] [--symbol ETH]
 *
 * Output: data/.quant-signals-latest.json + human-readable summary
 */

const fs = require('fs');
const path = require('path');
const { sma, rsi, macd, bollingerBands, atr } = require('./indicators');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');
const OUTPUT_PATH = path.join(DATA_DIR, '.quant-signals-latest.json');

// Signal thresholds (calibrated via backtest — lower thresholds catch more signals)
const THRESHOLDS = {
  STRONG_BUY: 50,
  BUY: 20,
  SELL: -20,
  STRONG_SELL: -50,
};

// Weights for composite score (must sum to 1)
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
    json: args.includes('--json'),
    symbol: args.find((_, i) => args[i - 1] === '--symbol') || null,
  };
}

function loadHistory(symbol) {
  const filePath = path.join(HISTORY_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function loadPortfolio() {
  if (!fs.existsSync(PORTFOLIO_PATH)) return null;
  return JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
}

function last(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}

function prevNonNull(arr, beforeIndex) {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}

/**
 * Compute all signals for a single asset
 */
function analyzeAsset(symbol, historyData, portfolio) {
  const closes = historyData.data.map((d) => d.close);
  const highs = historyData.data.map((d) => d.high);
  const lows = historyData.data.map((d) => d.low);
  const lastDate = historyData.data[historyData.data.length - 1].date;
  const price = closes[closes.length - 1];

  if (closes.length < 50) {
    return {
      symbol,
      price,
      currency: historyData.currency,
      dataAsOf: lastDate,
      error: `Insufficient data (${closes.length} days, need 50+)`,
    };
  }

  // Compute indicators
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const rsi14 = rsi(closes, 14);
  const macdResult = macd(closes, 12, 26, 9);
  const bb = bollingerBands(closes, 20, 2);
  const atr14 = atr(highs, lows, closes, 14);

  // Latest values
  const idx = closes.length - 1;
  const indicators = {
    sma20: sma20[idx],
    sma50: sma50[idx],
    sma200: sma200[idx],
    rsi14: rsi14[idx],
    macd: {
      line: macdResult.macdLine[idx],
      signal: macdResult.signalLine[idx],
      histogram: macdResult.histogram[idx],
    },
    bollingerBands: {
      upper: bb.upper[idx],
      middle: bb.middle[idx],
      lower: bb.lower[idx],
    },
    atr14: atr14[idx],
  };

  // --- Signal scoring ---
  const signals = {};
  let validWeightSum = 0;

  // 1. Trend (SMA) — score -100 to +100
  if (indicators.sma50 !== null && indicators.sma20 !== null) {
    let score = 0;
    const detail = [];

    if (indicators.sma200 !== null) {
      if (indicators.sma50 > indicators.sma200) {
        score += 40;
        detail.push('SMA50 > SMA200 (bullish)');
      } else {
        score -= 40;
        detail.push('SMA50 < SMA200 (bearish)');
      }
    }

    if (price > indicators.sma20) {
      score += 20;
      detail.push('price above SMA20');
    } else {
      score -= 20;
      detail.push('price below SMA20');
    }

    // Bonus: price above both SMAs
    if (indicators.sma200 !== null && price > indicators.sma50 && price > indicators.sma200) {
      score += 20;
      detail.push('price above SMA50+200');
    } else if (indicators.sma200 !== null && price < indicators.sma50 && price < indicators.sma200) {
      score -= 20;
      detail.push('price below SMA50+200');
    }

    signals.trend = { score: clamp(score, -100, 100), detail: detail.join(', ') };
    validWeightSum += WEIGHTS.trend;
  }

  // 2. Momentum (RSI) — score -100 to +100
  if (indicators.rsi14 !== null) {
    let score = 0;
    const detail = [];

    if (indicators.rsi14 < 30) {
      score += 60;
      detail.push(`RSI oversold (${indicators.rsi14.toFixed(1)})`);
      if (indicators.sma200 !== null && price > indicators.sma200) {
        score += 20;
        detail.push('in long-term uptrend');
      }
    } else if (indicators.rsi14 > 70) {
      score -= 60;
      detail.push(`RSI overbought (${indicators.rsi14.toFixed(1)})`);
      if (price < indicators.sma20) {
        score -= 20;
        detail.push('below SMA20');
      }
    } else if (indicators.rsi14 < 40) {
      score += 20;
      detail.push(`RSI low (${indicators.rsi14.toFixed(1)})`);
    } else if (indicators.rsi14 > 60) {
      score -= 20;
      detail.push(`RSI high (${indicators.rsi14.toFixed(1)})`);
    } else {
      detail.push(`RSI neutral (${indicators.rsi14.toFixed(1)})`);
    }

    signals.momentum = { score: clamp(score, -100, 100), detail: detail.join(', ') };
    validWeightSum += WEIGHTS.momentum;
  }

  // 3. Mean Reversion (Bollinger Bands + RSI)
  if (indicators.bollingerBands.lower !== null && indicators.rsi14 !== null) {
    let score = 0;
    const detail = [];

    if (price <= indicators.bollingerBands.lower && indicators.rsi14 < 35) {
      score = 70;
      detail.push('at lower BB + RSI < 35 (oversold bounce)');
    } else if (price >= indicators.bollingerBands.upper && indicators.rsi14 > 65) {
      score = -70;
      detail.push('at upper BB + RSI > 65 (overbought)');
    } else if (price <= indicators.bollingerBands.lower) {
      score = 30;
      detail.push('at lower Bollinger Band');
    } else if (price >= indicators.bollingerBands.upper) {
      score = -30;
      detail.push('at upper Bollinger Band');
    } else {
      const bandwidth = indicators.bollingerBands.upper - indicators.bollingerBands.lower;
      const position = (price - indicators.bollingerBands.lower) / bandwidth;
      detail.push(`BB position: ${(position * 100).toFixed(0)}%`);
    }

    signals.meanReversion = { score: clamp(score, -100, 100), detail: detail.join(', ') };
    validWeightSum += WEIGHTS.meanReversion;
  }

  // 4. MACD
  if (indicators.macd.histogram !== null) {
    let score = 0;
    const detail = [];

    const prevHistogram = prevNonNull(macdResult.histogram, idx);

    if (prevHistogram !== null && prevHistogram < 0 && indicators.macd.histogram >= 0) {
      score = 60;
      detail.push('MACD histogram crossed positive');
    } else if (prevHistogram !== null && prevHistogram > 0 && indicators.macd.histogram <= 0) {
      score = -60;
      detail.push('MACD histogram crossed negative');
    } else if (indicators.macd.histogram > 0) {
      score = 20;
      detail.push('MACD histogram positive');
    } else {
      score = -20;
      detail.push('MACD histogram negative');
    }

    signals.macd = { score: clamp(score, -100, 100), detail: detail.join(', ') };
    validWeightSum += WEIGHTS.macd;
  }

  // 5. Volatility (ATR)
  if (indicators.atr14 !== null) {
    let score = 0;
    const detail = [];

    // Compare current ATR to ATR 10 days ago
    const atrPrev = atr14[idx - 10];
    if (atrPrev !== null) {
      const atrChange = (indicators.atr14 - atrPrev) / atrPrev;
      if (atrChange < -0.15) {
        score = 30;
        detail.push(`ATR compressing (${(atrChange * 100).toFixed(1)}%)`);
      } else if (atrChange > 0.30) {
        score = -30;
        detail.push(`ATR spiking (${(atrChange * 100).toFixed(1)}%)`);
      } else {
        detail.push(`ATR stable (${(atrChange * 100).toFixed(1)}%)`);
      }
    } else {
      detail.push('ATR: insufficient comparison data');
    }

    signals.volatility = { score, detail: detail.join(', ') };
    validWeightSum += WEIGHTS.volatility;
  }

  // Composite score (weighted, normalized by available weights)
  let compositeScore = 0;
  if (validWeightSum > 0) {
    for (const [key, signal] of Object.entries(signals)) {
      compositeScore += signal.score * (WEIGHTS[key] / validWeightSum);
    }
  }
  compositeScore = Math.round(clamp(compositeScore, -100, 100));

  // Classify signal
  let signalName;
  if (compositeScore > THRESHOLDS.STRONG_BUY) signalName = 'STRONG_BUY';
  else if (compositeScore > THRESHOLDS.BUY) signalName = 'BUY';
  else if (compositeScore < THRESHOLDS.STRONG_SELL) signalName = 'STRONG_SELL';
  else if (compositeScore < THRESHOLDS.SELL) signalName = 'SELL';
  else signalName = 'HOLD';

  // Confidence based on available indicators
  const indicatorCount = Object.keys(signals).length;
  const confidence = indicatorCount >= 4 ? 'high' : indicatorCount >= 2 ? 'medium' : 'low';

  // Position sizing via ATR (if available)
  let positionSizing = null;
  if (indicators.atr14 !== null && portfolio) {
    const balance = portfolio.totals?.balance_eur || 5000;
    const riskPerTrade = balance * 0.02; // 2% max risk
    const stopDistance = 2 * indicators.atr14;
    const stopDistancePct = (stopDistance / price) * 100;
    const suggestedUnits = riskPerTrade / stopDistance;

    positionSizing = {
      stopPrice: +(price - stopDistance).toFixed(4),
      stopDistancePct: +stopDistancePct.toFixed(2),
      riskPerTradeEur: +riskPerTrade.toFixed(2),
      suggestedUnits: +suggestedUnits.toFixed(4),
      basedOnAtr: true,
    };
  }

  return {
    symbol,
    price,
    currency: historyData.currency,
    dataAsOf: lastDate,
    dataPoints: closes.length,
    indicators: roundIndicators(indicators),
    signals,
    composite: {
      score: compositeScore,
      signal: signalName,
      confidence,
    },
    positionSizing,
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function roundIndicators(ind) {
  const round = (v) => (v !== null ? +v.toFixed(4) : null);
  return {
    sma20: round(ind.sma20),
    sma50: round(ind.sma50),
    sma200: round(ind.sma200),
    rsi14: ind.rsi14 !== null ? +ind.rsi14.toFixed(2) : null,
    macd: {
      line: round(ind.macd.line),
      signal: round(ind.macd.signal),
      histogram: round(ind.macd.histogram),
    },
    bollingerBands: {
      upper: round(ind.bollingerBands.upper),
      middle: round(ind.bollingerBands.middle),
      lower: round(ind.bollingerBands.lower),
    },
    atr14: round(ind.atr14),
  };
}

function getSymbolsToAnalyze(filterSymbol) {
  const symbols = new Set();

  // Portfolio holdings
  if (fs.existsSync(PORTFOLIO_PATH)) {
    const portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
    for (const asset of Object.keys(portfolio.holdings)) {
      if (asset !== 'CASH') symbols.add(asset);
    }
  }

  // Watchlist
  ['EQQQ', 'SOL', 'SXR8', 'VWCE'].forEach((s) => symbols.add(s));

  if (filterSymbol) {
    return symbols.has(filterSymbol) ? [filterSymbol] : [filterSymbol];
  }

  return [...symbols];
}

function formatOutput(result) {
  const lines = [];
  lines.push('=== MakeMeRich Quantitative Signals ===');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push('');

  // Summary table
  const groups = { STRONG_BUY: [], BUY: [], HOLD: [], SELL: [], STRONG_SELL: [] };
  for (const [symbol, data] of Object.entries(result.assets)) {
    if (data.error) {
      lines.push(`${symbol}: ${data.error}`);
      continue;
    }
    groups[data.composite.signal].push(symbol);
  }

  for (const [signal, assets] of Object.entries(groups)) {
    if (assets.length > 0) {
      lines.push(`${signal}: ${assets.join(', ')}`);
    }
  }

  lines.push('');

  // Per-asset detail
  for (const [symbol, data] of Object.entries(result.assets)) {
    if (data.error) continue;

    lines.push(`--- ${symbol} (${data.currency} ${data.price.toFixed(2)}) ---`);
    lines.push(`  Score: ${data.composite.score} → ${data.composite.signal} (${data.composite.confidence})`);

    for (const [key, signal] of Object.entries(data.signals)) {
      const bar = signal.score > 0 ? '+'.repeat(Math.min(signal.score / 10, 10)) : '-'.repeat(Math.min(Math.abs(signal.score) / 10, 10));
      lines.push(`  ${key.padEnd(14)} ${String(signal.score).padStart(4)} [${bar.padEnd(10)}] ${signal.detail}`);
    }

    if (data.positionSizing) {
      lines.push(`  ATR stop: ${data.positionSizing.stopPrice} (${data.positionSizing.stopDistancePct}% away)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  const { json, symbol } = parseArgs();
  const symbols = getSymbolsToAnalyze(symbol);
  const portfolio = loadPortfolio();

  const result = {
    generatedAt: new Date().toISOString(),
    assets: {},
    summary: { STRONG_BUY: [], BUY: [], HOLD: [], SELL: [], STRONG_SELL: [] },
  };

  for (const sym of symbols) {
    const history = loadHistory(sym);
    if (!history) {
      result.assets[sym] = { symbol: sym, error: `No history data (run fetch-history.js first)` };
      continue;
    }

    const analysis = analyzeAsset(sym, history, portfolio);
    result.assets[sym] = analysis;

    if (analysis.composite?.signal) {
      result.summary[analysis.composite.signal].push(sym);
    }
  }

  // Save to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));

  // Output
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
