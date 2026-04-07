#!/usr/bin/env node
/**
 * MakeMeRich - Historical Portfolio Simulator
 *
 * Replays the entire game period (Jan 27 – Apr 7, 2026) using the current
 * quantitative signal rules. Produces adjusted daily entries, trade logs,
 * and a final portfolio.json.
 *
 * Uses the same indicator logic as generate-quant-signals.js and backtest.js,
 * and the same order execution logic as execute-signals.js.
 *
 * Requires: data/history/{SYMBOL}.json for all assets + EURUSD.json
 *
 * Usage:
 *   node scripts/simulate-history.js [--dry-run] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { sma, rsi, macd, bollingerBands, atr } = require('./indicators');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// ── Configuration ──────────────────────────────────────────────────────────

const GAME_START = '2026-01-27';
const GAME_END = '2026-04-07';
const STARTING_CAPITAL = 5000;

// Position limits (from RULES.md — absolute, no overrides)
const LIMITS = {
  MAX_SINGLE_POSITION: 0.50,
  MIN_CASH_RESERVE: 0.05,
  MAX_HIGH_RISK: 0.30,
  MAX_INVERSE_LEVERAGED: 0.15,
  MAX_RISK_PER_TRADE: 0.02,
};

// Fee structure
const FEES = { ETF: 0.001, ETC: 0.001, Stock: 0.001, Crypto: 0.005 };

// Signal thresholds
const THRESHOLDS = { STRONG_BUY: 50, BUY: 20, SELL: -20, STRONG_SELL: -50 };

// Indicator weights
const WEIGHTS = {
  trend: 0.25, momentum: 0.25, meanReversion: 0.20, macd: 0.15, volatility: 0.15,
};

// Stop-loss / take-profit rules (from RULES.md)
const STOP_LOSS_PCT = 0.15;       // Exit at -15% from entry
const TRAILING_STOP_PCT = 0.10;   // Exit at -10% from high
const TAKE_PROFIT_1_PCT = 0.30;   // 25% at +30%
const TAKE_PROFIT_2_PCT = 0.50;   // 25% at +50%
const TAKE_PROFIT_SELL_PCT = 0.25; // Sell 25% each time

// Asset metadata
const ASSET_META = {
  BTC:  { type: 'Crypto', risk: 'high', currency: 'USD', description: 'Bitcoin' },
  ETH:  { type: 'Crypto', risk: 'high', currency: 'USD', description: 'Ethereum' },
  SOL:  { type: 'Crypto', risk: 'high', currency: 'USD', description: 'Solana' },
  '4GLD': { type: 'ETC', risk: 'medium', currency: 'EUR', description: 'Xetra-Gold ETC', defensive: true },
  XEON: { type: 'ETF', risk: 'low', currency: 'EUR', description: 'Lyxor Smart Overnight Return', defensive: true },
  DXS3: { type: 'ETF', risk: 'high', currency: 'EUR', inverse: true, leveraged: true, description: 'S&P500 Inverse Daily' },
  EQQQ: { type: 'ETF', risk: 'medium', currency: 'EUR', description: 'Invesco NASDAQ-100 UCITS' },
  SXR8: { type: 'ETF', risk: 'medium', currency: 'EUR', description: 'iShares S&P 500 UCITS' },
  VWCE: { type: 'ETF', risk: 'medium', currency: 'EUR', description: 'Vanguard All-World UCITS' },
  SAP:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'SAP SE' },
  ASML: { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'ASML Holding' },
  MC:   { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'LVMH' },
  ITX:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'Inditex' },
  SIE:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'Siemens' },
  AIR:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'Airbus' },
  NOVO: { type: 'Stock', risk: 'medium', currency: 'DKK', description: 'Novo Nordisk' },
  ALV:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'Allianz' },
  TTE:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'TotalEnergies' },
  DTE:  { type: 'Stock', risk: 'medium', currency: 'EUR', description: 'Deutsche Telekom' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function round2(v) { return Math.round(v * 100) / 100; }
function round4(v) { return Math.round(v * 10000) / 10000; }

function getFeeRate(symbol) {
  const meta = ASSET_META[symbol];
  return FEES[meta?.type] || FEES.ETF;
}

function isHighRisk(symbol) { return ASSET_META[symbol]?.risk === 'high'; }
function isInverse(symbol) { return ASSET_META[symbol]?.inverse === true; }
function isDefensive(symbol) { return ASSET_META[symbol]?.defensive === true; }

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
  };
}

// ── Market Regime ──────────────────────────────────────────────────────────

function computeMarketRegimeAtDate(sp500History, vixHistory, date) {
  if (!sp500History || !vixHistory) return 'unknown';

  const sp500Data = sp500History.data;
  const vixData = vixHistory.data;

  // Find closest SP500 and VIX values as of the date
  let sp500Close = null;
  let sp500Idx = -1;
  for (let i = sp500Data.length - 1; i >= 0; i--) {
    if (sp500Data[i].date <= date) {
      sp500Close = sp500Data[i].close;
      sp500Idx = i;
      break;
    }
  }

  let vixClose = null;
  for (let i = vixData.length - 1; i >= 0; i--) {
    if (vixData[i].date <= date) {
      vixClose = vixData[i].close;
      break;
    }
  }

  if (sp500Idx < 0 || !sp500Close || !vixClose) return 'unknown';

  // Compute SMA50 for SP500
  const closes = sp500Data.slice(Math.max(0, sp500Idx - 200), sp500Idx + 1).map((d) => d.close);
  if (closes.length < 50) return 'unknown';
  const sma50Arr = sma(closes, 50);
  const sp500Sma50 = sma50Arr[sma50Arr.length - 1];

  if (!sp500Sma50) return 'unknown';

  // Apply regime rules (from plan: VIX < 22 risk-on, 22-30 risk-off, > 30 crisis)
  if (vixClose > 30) {
    return 'crisis';
  } else if (sp500Close < sp500Sma50 || vixClose >= 22) {
    return 'risk-off';
  } else {
    return 'risk-on';
  }
}

// ── Data Loading ────────────────────────────────────────────────────────────

function loadHistory(symbol) {
  const filePath = path.join(HISTORY_DIR, `${symbol}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildDateIndex(historyData) {
  const index = {};
  historyData.data.forEach((d, i) => { index[d.date] = i; });
  return index;
}

function findClosestIndex(historyData, dateIndex, date) {
  if (dateIndex[date] !== undefined) return dateIndex[date];
  // Find the most recent date before the target
  const data = historyData.data;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].date <= date) return i;
  }
  return -1;
}

// ── Signal Computation (same logic as generate-quant-signals.js) ────────────

function precomputeIndicators(closes, highs, lows) {
  return {
    sma20Arr: sma(closes, 20),
    sma50Arr: sma(closes, 50),
    sma200Arr: sma(closes, 200),
    rsi14Arr: rsi(closes, 14),
    macdResult: macd(closes, 12, 26, 9),
    bb: bollingerBands(closes, 20, 2),
    atr14Arr: atr(highs, lows, closes, 14),
  };
}

function computeSignalAtIndex(closes, idx, pre) {
  const price = closes[idx];
  let compositeScore = 0;
  let validWeightSum = 0;
  const signals = {};

  // 1. Trend
  if (pre.sma50Arr[idx] !== null && pre.sma20Arr[idx] !== null) {
    let score = 0;
    if (pre.sma200Arr[idx] !== null) {
      score += pre.sma50Arr[idx] > pre.sma200Arr[idx] ? 40 : -40;
    }
    score += price > pre.sma20Arr[idx] ? 20 : -20;
    if (pre.sma200Arr[idx] !== null) {
      if (price > pre.sma50Arr[idx] && price > pre.sma200Arr[idx]) score += 20;
      else if (price < pre.sma50Arr[idx] && price < pre.sma200Arr[idx]) score -= 20;
    }
    score = clamp(score, -100, 100);
    signals.trend = score;
    compositeScore += score * WEIGHTS.trend;
    validWeightSum += WEIGHTS.trend;
  }

  // 2. Momentum (RSI)
  if (pre.rsi14Arr[idx] !== null) {
    let score = 0;
    if (pre.rsi14Arr[idx] < 30) {
      score = 60;
      if (pre.sma200Arr[idx] !== null && price > pre.sma200Arr[idx]) score = 80;
    } else if (pre.rsi14Arr[idx] > 70) {
      score = -60;
      if (pre.sma20Arr[idx] !== null && price < pre.sma20Arr[idx]) score = -80;
    } else if (pre.rsi14Arr[idx] < 40) score = 20;
    else if (pre.rsi14Arr[idx] > 60) score = -20;
    score = clamp(score, -100, 100);
    signals.momentum = score;
    compositeScore += score * WEIGHTS.momentum;
    validWeightSum += WEIGHTS.momentum;
  }

  // 3. Mean Reversion (BB + RSI)
  if (pre.bb.lower[idx] !== null && pre.rsi14Arr[idx] !== null) {
    let score = 0;
    if (price <= pre.bb.lower[idx] && pre.rsi14Arr[idx] < 35) score = 70;
    else if (price >= pre.bb.upper[idx] && pre.rsi14Arr[idx] > 65) score = -70;
    else if (price <= pre.bb.lower[idx]) score = 30;
    else if (price >= pre.bb.upper[idx]) score = -30;
    score = clamp(score, -100, 100);
    signals.meanReversion = score;
    compositeScore += score * WEIGHTS.meanReversion;
    validWeightSum += WEIGHTS.meanReversion;
  }

  // 4. MACD
  const hist = pre.macdResult.histogram;
  if (hist[idx] !== null) {
    let score = 0;
    const prev = idx > 0 ? hist[idx - 1] : null;
    if (prev !== null && prev < 0 && hist[idx] >= 0) score = 60;
    else if (prev !== null && prev > 0 && hist[idx] <= 0) score = -60;
    else if (hist[idx] > 0) score = 20;
    else score = -20;
    score = clamp(score, -100, 100);
    signals.macd = score;
    compositeScore += score * WEIGHTS.macd;
    validWeightSum += WEIGHTS.macd;
  }

  // 5. Volatility (ATR)
  if (pre.atr14Arr[idx] !== null && idx >= 10 && pre.atr14Arr[idx - 10] !== null) {
    const atrChange = (pre.atr14Arr[idx] - pre.atr14Arr[idx - 10]) / pre.atr14Arr[idx - 10];
    let score = 0;
    if (atrChange < -0.15) score = 30;
    else if (atrChange > 0.30) score = -30;
    signals.volatility = score;
    compositeScore += score * WEIGHTS.volatility;
    validWeightSum += WEIGHTS.volatility;
  }

  if (validWeightSum === 0) return { score: 0, signal: 'HOLD', atr: null, signals };

  const score = Math.round(clamp(compositeScore / validWeightSum, -100, 100));
  let signal;
  if (score > THRESHOLDS.STRONG_BUY) signal = 'STRONG_BUY';
  else if (score > THRESHOLDS.BUY) signal = 'BUY';
  else if (score < THRESHOLDS.STRONG_SELL) signal = 'STRONG_SELL';
  else if (score < THRESHOLDS.SELL) signal = 'SELL';
  else signal = 'HOLD';

  return { score, signal, atr: pre.atr14Arr[idx], signals };
}

// ── EUR Conversion ──────────────────────────────────────────────────────────

// Module-level exchange rate data (set once during simulation init)
let FX = { eurusdIndex: {}, dkkeurIndex: {} };

function initExchangeRates(eurusdHistory, dkkeurHistory) {
  // EURUSD=X gives how many USD per 1 EUR (e.g., 1.08)
  // So EUR per 1 USD = 1 / close
  if (eurusdHistory) {
    for (const d of eurusdHistory.data) {
      FX.eurusdIndex[d.date] = 1 / d.close;
    }
  }
  if (dkkeurHistory) {
    for (const d of dkkeurHistory.data) {
      FX.dkkeurIndex[d.date] = d.close;
    }
  }
}

function getEurPerUsd(date) {
  if (FX.eurusdIndex[date]) return FX.eurusdIndex[date];
  const dates = Object.keys(FX.eurusdIndex).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= date) return FX.eurusdIndex[dates[i]];
  }
  return 0.92;
}

function getEurPerDkk(date) {
  if (FX.dkkeurIndex[date]) return FX.dkkeurIndex[date];
  const dates = Object.keys(FX.dkkeurIndex).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] <= date) return FX.dkkeurIndex[dates[i]];
  }
  return 1 / 7.46;
}

function toEur(symbol, nativePrice, date) {
  const currency = ASSET_META[symbol]?.currency || 'EUR';
  if (currency === 'EUR') return nativePrice;
  if (currency === 'USD') return nativePrice * getEurPerUsd(date);
  if (currency === 'DKK') return nativePrice * getEurPerDkk(date);
  return nativePrice;
}

// ── Portfolio State ─────────────────────────────────────────────────────────

function computeBalance(portfolio, allPrices, date) {
  let total = portfolio.cash;
  for (const [symbol, pos] of Object.entries(portfolio.positions)) {
    const price = allPrices[symbol];
    if (!price) continue;
    const valueEur = toEur(symbol, price, date) * pos.units;
    total += valueEur;
  }
  return total;
}

function computePortfolioState(portfolio, allPrices, date) {
  const balance = computeBalance(portfolio, allPrices, date);
  let highRiskValue = 0;
  let inverseValue = 0;
  const positionValues = {};

  for (const [symbol, pos] of Object.entries(portfolio.positions)) {
    const price = allPrices[symbol];
    if (!price) continue;
    const valueEur = toEur(symbol, price, date) * pos.units;
    positionValues[symbol] = valueEur;
    if (isHighRisk(symbol)) highRiskValue += valueEur;
    if (isInverse(symbol)) inverseValue += valueEur;
  }

  return {
    balance,
    cash: portfolio.cash,
    cashPct: portfolio.cash / balance,
    highRiskValue,
    highRiskPct: highRiskValue / balance,
    inverseValue,
    inversePct: inverseValue / balance,
    positionValues,
  };
}

// ── Simulation Engine ───────────────────────────────────────────────────────

function simulate(verbose) {
  // Load all history data and precompute indicators
  const symbols = Object.keys(ASSET_META);
  const historyMap = {};
  const dateIndexMap = {};
  const indicatorMap = {};

  for (const sym of symbols) {
    const hist = loadHistory(sym);
    if (!hist || hist.data.length < 50) {
      if (verbose) console.log(`Skipping ${sym}: insufficient history`);
      continue;
    }
    historyMap[sym] = hist;
    dateIndexMap[sym] = buildDateIndex(hist);

    const closes = hist.data.map((d) => d.close);
    const highs = hist.data.map((d) => d.high);
    const lows = hist.data.map((d) => d.low);
    indicatorMap[sym] = precomputeIndicators(closes, highs, lows);
  }

  const activeSymbols = Object.keys(historyMap);
  if (verbose) console.log(`Active universe: ${activeSymbols.join(', ')} (${activeSymbols.length})`);

  // Load exchange rates and market regime data
  const eurusdHistory = loadHistory('EURUSD');
  const dkkeurHistory = loadHistory('DKKEUR');
  initExchangeRates(eurusdHistory, dkkeurHistory);

  const sp500History = loadHistory('SP500');
  const vixHistory = loadHistory('VIX');

  // Determine game trading days using SAP (European market reference)
  const sapHistory = historyMap.SAP || historyMap.VWCE;
  if (!sapHistory) throw new Error('Need SAP or VWCE history for trading calendar');

  const gameDays = sapHistory.data
    .filter((d) => d.date >= GAME_START && d.date <= GAME_END)
    .map((d) => d.date);

  if (verbose) console.log(`Game days: ${gameDays.length} (${gameDays[0]} to ${gameDays[gameDays.length - 1]})`);

  // Portfolio state
  const portfolio = {
    cash: STARTING_CAPITAL,
    positions: {},
    // Track high watermark for trailing stop
  };

  const allTrades = [];
  const dailyEntries = [];

  // Day 0 — initial entry
  dailyEntries.push(makeDailyEntry(GAME_START, 0, portfolio, {}, []));

  // Simulate each game day
  for (let dayNum = 0; dayNum < gameDays.length; dayNum++) {
    const date = gameDays[dayNum];
    const dayLabel = dayNum + 1;

    // Get current prices for all assets on this date
    const allPrices = {};
    const assetIndices = {};
    for (const sym of activeSymbols) {
      const idx = findClosestIndex(historyMap[sym], dateIndexMap[sym], date);
      if (idx >= 0) {
        allPrices[sym] = historyMap[sym].data[idx].close;
        assetIndices[sym] = idx;
      }
    }

    const state = computePortfolioState(portfolio, allPrices, date);
    const dayTrades = [];

    // ── Step 1: Check stop-loss / trailing stop / take-profit ──
    const positionsToClose = [];
    for (const [symbol, pos] of Object.entries(portfolio.positions)) {
      const price = allPrices[symbol];
      if (!price) continue;

      const priceEur = toEur(symbol, price, date);
      const entryPriceEur = toEur(symbol, pos.entryPrice, pos.entryDate);

      // Update high watermark
      if (!pos.highPrice || price > pos.highPrice) pos.highPrice = price;
      const highPriceEur = toEur(symbol, pos.highPrice, date);

      const pnlFromEntry = (priceEur - entryPriceEur) / entryPriceEur;
      const drawdownFromHigh = (highPriceEur - priceEur) / highPriceEur;

      // Stop-loss: -15% from entry
      if (pnlFromEntry <= -STOP_LOSS_PCT) {
        positionsToClose.push({ symbol, reason: `STOP_LOSS (${(pnlFromEntry * 100).toFixed(1)}% from entry)`, sellPct: 1.0 });
        continue;
      }

      // Trailing stop: -10% from high
      if (pnlFromEntry > 0 && drawdownFromHigh >= TRAILING_STOP_PCT) {
        positionsToClose.push({ symbol, reason: `TRAILING_STOP (${(drawdownFromHigh * 100).toFixed(1)}% from high)`, sellPct: 1.0 });
        continue;
      }

      // Take profit 1: +30% → sell 25%
      if (pnlFromEntry >= TAKE_PROFIT_1_PCT && !pos.tookProfit1) {
        pos.tookProfit1 = true;
        positionsToClose.push({ symbol, reason: `TAKE_PROFIT_1 (+${(pnlFromEntry * 100).toFixed(1)}%)`, sellPct: TAKE_PROFIT_SELL_PCT });
      }

      // Take profit 2: +50% → sell 25%
      if (pnlFromEntry >= TAKE_PROFIT_2_PCT && !pos.tookProfit2) {
        pos.tookProfit2 = true;
        positionsToClose.push({ symbol, reason: `TAKE_PROFIT_2 (+${(pnlFromEntry * 100).toFixed(1)}%)`, sellPct: TAKE_PROFIT_SELL_PCT });
      }
    }

    // Execute stop-loss / take-profit sells
    for (const { symbol, reason, sellPct } of positionsToClose) {
      const pos = portfolio.positions[symbol];
      if (!pos) continue;
      const price = allPrices[symbol];
      const sellUnits = pos.units * sellPct;
      const valueNative = sellUnits * price;
      const valueEur = toEur(symbol, price, date) * sellUnits;
      const fee = valueEur * getFeeRate(symbol);

      portfolio.cash += valueEur - fee;
      pos.units -= sellUnits;

      dayTrades.push({
        date, action: 'SELL', asset: symbol, units: round4(sellUnits),
        price: round4(price), amount_eur: round2(valueEur), fee_eur: round2(fee),
        reason, session: 'auto',
      });

      if (pos.units < 0.0001) delete portfolio.positions[symbol];
    }

    // ── Step 2: Compute signals for all assets ──
    const signalResults = {};
    for (const sym of activeSymbols) {
      const idx = assetIndices[sym];
      if (idx === undefined || idx < 50) continue;
      const closes = historyMap[sym].data.map((d) => d.close);
      const result = computeSignalAtIndex(closes, idx, indicatorMap[sym]);
      signalResults[sym] = result;
    }

    // ── Step 3: Generate and execute orders ──
    // Re-compute state after stop-loss sells
    const stateAfterStops = computePortfolioState(portfolio, allPrices, date);

    // Collect sell signals
    for (const [sym, sig] of Object.entries(signalResults)) {
      if (!portfolio.positions[sym]) continue;
      if (sig.signal !== 'SELL' && sig.signal !== 'STRONG_SELL') continue;

      const pos = portfolio.positions[sym];
      const sellPct = sig.signal === 'STRONG_SELL' ? 1.0 : 0.5;
      const sellUnits = pos.units * sellPct;
      const price = allPrices[sym];
      const valueEur = toEur(sym, price, date) * sellUnits;
      const fee = valueEur * getFeeRate(sym);

      portfolio.cash += valueEur - fee;
      pos.units -= sellUnits;

      dayTrades.push({
        date, action: 'SELL', asset: sym, units: round4(sellUnits),
        price: round4(price), amount_eur: round2(valueEur), fee_eur: round2(fee),
        reason: `${sig.signal} (score: ${sig.score})`, session: 'close',
      });

      if (pos.units < 0.0001) delete portfolio.positions[sym];
    }

    // Compute market regime for this day
    const regime = computeMarketRegimeAtDate(sp500History, vixHistory, date);

    // Collect buy signals — sort by score descending (best signals first)
    // Minimal regime filtering: only block crisis except XEON
    const buySignals = Object.entries(signalResults)
      .filter(([sym, sig]) => (sig.signal === 'BUY' || sig.signal === 'STRONG_BUY') && !portfolio.positions[sym])
      .filter(([sym, sig]) => {
        // Only block crisis mode (VIX > 30) except for XEON
        if (regime === 'crisis' && sym !== 'XEON') return false;
        return true;
      })
      .sort((a, b) => b[1].score - a[1].score);

    for (const [sym, sig] of buySignals) {
      const currentState = computePortfolioState(portfolio, allPrices, date);
      const availableCash = portfolio.cash - currentState.balance * LIMITS.MIN_CASH_RESERVE;
      if (availableCash <= 50) break;

      const price = allPrices[sym];
      const priceEur = toEur(sym, price, date);

      // Position sizing via ATR
      let buyAmountEur;
      if (sig.atr) {
        const stopDistance = 2 * sig.atr;
        const stopDistancePct = stopDistance / price;
        const riskAmount = currentState.balance * LIMITS.MAX_RISK_PER_TRADE;
        buyAmountEur = Math.min(riskAmount / stopDistancePct, availableCash);
      } else {
        buyAmountEur = Math.min(currentState.balance * 0.10, availableCash);
      }

      // Enforce position limits
      buyAmountEur = Math.min(buyAmountEur, currentState.balance * LIMITS.MAX_SINGLE_POSITION);

      // Enforce high-risk limit
      if (isHighRisk(sym)) {
        const room = currentState.balance * LIMITS.MAX_HIGH_RISK - currentState.highRiskValue;
        if (room <= 0) continue;
        buyAmountEur = Math.min(buyAmountEur, room);
      }

      // Enforce inverse/leveraged limit
      if (isInverse(sym)) {
        const room = currentState.balance * LIMITS.MAX_INVERSE_LEVERAGED - currentState.inverseValue;
        if (room <= 0) continue;
        buyAmountEur = Math.min(buyAmountEur, room);
      }

      if (buyAmountEur < 50) continue;

      const fee = buyAmountEur * getFeeRate(sym);
      const netAmountEur = buyAmountEur - fee;
      const units = netAmountEur / priceEur;

      portfolio.cash -= buyAmountEur;
      portfolio.positions[sym] = {
        units,
        entryPrice: price,
        entryDate: date,
        highPrice: price,
        tookProfit1: false,
        tookProfit2: false,
      };

      dayTrades.push({
        date, action: 'BUY', asset: sym, units: round4(units),
        price: round4(price), amount_eur: round2(buyAmountEur), fee_eur: round2(fee),
        reason: `${sig.signal} (score: ${sig.score})`, session: 'close',
      });
    }

    // ── Step 4: Limit violation corrections ──
    const stateAfterTrades = computePortfolioState(portfolio, allPrices, date);

    // Fix inverse limit violations
    if (stateAfterTrades.inversePct > LIMITS.MAX_INVERSE_LEVERAGED + 0.001) {
      for (const [sym, pos] of Object.entries(portfolio.positions)) {
        if (!isInverse(sym)) continue;
        const excess = stateAfterTrades.inverseValue - stateAfterTrades.balance * LIMITS.MAX_INVERSE_LEVERAGED;
        if (excess <= 0) break;
        const price = allPrices[sym];
        const posValueEur = stateAfterTrades.positionValues[sym];
        const sellValueEur = Math.min(excess, posValueEur);
        const sellUnits = (sellValueEur / posValueEur) * pos.units;
        const fee = sellValueEur * getFeeRate(sym);

        portfolio.cash += sellValueEur - fee;
        pos.units -= sellUnits;
        if (pos.units < 0.0001) delete portfolio.positions[sym];

        dayTrades.push({
          date, action: 'SELL', asset: sym, units: round4(sellUnits),
          price: round4(price), amount_eur: round2(sellValueEur), fee_eur: round2(fee),
          reason: `LIMIT_VIOLATION inverse ${(stateAfterTrades.inversePct * 100).toFixed(1)}%`, session: 'auto',
        });
      }
    }

    // Fix high-risk limit violations
    if (stateAfterTrades.highRiskPct > LIMITS.MAX_HIGH_RISK + 0.001) {
      let excess = stateAfterTrades.highRiskValue - stateAfterTrades.balance * LIMITS.MAX_HIGH_RISK;
      const hrPositions = Object.entries(portfolio.positions)
        .filter(([s]) => isHighRisk(s))
        .sort((a, b) => {
          const va = stateAfterTrades.positionValues[a[0]] || 0;
          const vb = stateAfterTrades.positionValues[b[0]] || 0;
          return vb - va;
        });

      for (const [sym, pos] of hrPositions) {
        if (excess <= 0) break;
        const price = allPrices[sym];
        const posValueEur = stateAfterTrades.positionValues[sym];
        const sellValueEur = Math.min(excess, posValueEur * 0.5);
        if (sellValueEur < 50) continue;
        const sellUnits = (sellValueEur / posValueEur) * pos.units;
        const fee = sellValueEur * getFeeRate(sym);

        portfolio.cash += sellValueEur - fee;
        pos.units -= sellUnits;
        if (pos.units < 0.0001) delete portfolio.positions[sym];
        excess -= sellValueEur;

        dayTrades.push({
          date, action: 'SELL', asset: sym, units: round4(sellUnits),
          price: round4(price), amount_eur: round2(sellValueEur), fee_eur: round2(fee),
          reason: `LIMIT_VIOLATION high-risk ${(stateAfterTrades.highRiskPct * 100).toFixed(1)}%`, session: 'auto',
        });
      }
    }

    allTrades.push(...dayTrades);

    // ── Step 5: Daily entry ──
    const entry = makeDailyEntry(date, dayLabel, portfolio, allPrices, dayTrades);
    dailyEntries.push(entry);

    if (verbose) {
      const trades = dayTrades.length > 0 ? ` | ${dayTrades.map((t) => `${t.action} ${t.asset}`).join(', ')}` : '';
      console.log(`Day ${dayLabel} ${date}: EUR ${entry.balance.total.toFixed(2)} (${entry.totalReturn >= 0 ? '+' : ''}${entry.totalReturn}%)${trades}`);
    }
  }

  return { dailyEntries, allTrades, portfolio };
}

function makeDailyEntry(date, dayNum, portfolio, allPrices, dayTrades) {
  const positions = [
    { asset: 'CASH', type: 'Cash', value: round2(portfolio.cash), pnlPercent: 0 },
  ];

  let totalValue = portfolio.cash;

  for (const [symbol, pos] of Object.entries(portfolio.positions)) {
    const price = allPrices[symbol] || pos.entryPrice;
    const meta = ASSET_META[symbol];
    const priceEur = toEur(symbol, price, date);
    const entryPriceEur = toEur(symbol, pos.entryPrice, pos.entryDate);
    const valueEur = priceEur * pos.units;
    const pnl = entryPriceEur > 0 ? ((priceEur - entryPriceEur) / entryPriceEur) * 100 : 0;

    totalValue += valueEur;

    const posData = {
      asset: symbol,
      type: meta?.type || 'Unknown',
      description: meta?.description || symbol,
      units: round4(pos.units),
      value: round2(valueEur),
      pnlPercent: round2(pnl),
    };

    if (meta?.currency === 'EUR') {
      posData.entryPriceEUR = round4(pos.entryPrice);
      posData.currentPriceEUR = round4(price);
    } else if (meta?.currency === 'USD') {
      posData.entryPriceUSD = round4(pos.entryPrice);
      posData.currentPriceUSD = round4(price);
    } else if (meta?.currency === 'DKK') {
      posData.entryPriceDKK = round4(pos.entryPrice);
      posData.currentPriceDKK = round4(price);
    }

    positions.push(posData);
  }

  totalValue = round2(totalValue);
  const totalReturn = round2(((totalValue - STARTING_CAPITAL) / STARTING_CAPITAL) * 100);
  const eurUsd = getEurPerUsd(date);

  return {
    date,
    day: dayNum,
    balance: { total: totalValue, currency: 'EUR' },
    change: { absolute: 0, percentage: 0 },
    totalReturn,
    positions,
    trades: dayTrades.length > 0 ? dayTrades : undefined,
    metadata: {
      generatedAt: `${date}T21:30:00.000Z`,
      eurUsd: round4(eurUsd),
      simulated: true,
    },
  };
}

// ── Output ──────────────────────────────────────────────────────────────────

function saveResults(dailyEntries, allTrades, portfolio, dryRun) {
  // Compute daily changes now that we have all entries
  for (let i = 1; i < dailyEntries.length; i++) {
    const prev = dailyEntries[i - 1];
    const curr = dailyEntries[i];
    const change = curr.balance.total - prev.balance.total;
    curr.change = {
      absolute: round2(change),
      percentage: round2((change / prev.balance.total) * 100),
    };
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Would save:');
    console.log(`  ${dailyEntries.length} daily entries`);
    console.log(`  ${allTrades.length} trades`);
    return;
  }

  // Remove existing daily entries
  const existingFiles = fs.readdirSync(DATA_DIR).filter((f) => f.match(/^\d{4}-\d{2}-\d{2}\.json$/));
  for (const f of existingFiles) {
    fs.unlinkSync(path.join(DATA_DIR, f));
  }

  // Save daily entries
  for (const entry of dailyEntries) {
    const filePath = path.join(DATA_DIR, `${entry.date}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry, null, 2));
  }

  // Save trades by month
  const tradesDir = path.join(DATA_DIR, 'trades');
  if (!fs.existsSync(tradesDir)) fs.mkdirSync(tradesDir, { recursive: true });

  // Clear existing trade files
  const existingTrades = fs.readdirSync(tradesDir).filter((f) => f.endsWith('.json'));
  for (const f of existingTrades) {
    fs.unlinkSync(path.join(tradesDir, f));
  }

  // Group trades by month
  const tradesByMonth = {};
  for (const trade of allTrades) {
    const month = trade.date.slice(0, 7);
    if (!tradesByMonth[month]) tradesByMonth[month] = [];
    tradesByMonth[month].push(trade);
  }
  for (const [month, trades] of Object.entries(tradesByMonth)) {
    fs.writeFileSync(path.join(tradesDir, `${month}.json`), JSON.stringify(trades, null, 2));
  }

  // Save final portfolio.json
  const lastEntry = dailyEntries[dailyEntries.length - 1];
  const lastDate = lastEntry.date;

  // Build holdings from portfolio state
  const holdings = { CASH: { amount_eur: round2(portfolio.cash) } };
  for (const [symbol, pos] of Object.entries(portfolio.positions)) {
    const meta = ASSET_META[symbol];
    const holding = { units: round4(pos.units) };

    if (meta?.currency === 'EUR') {
      holding.entry_price_eur = round4(pos.entryPrice);
    } else if (meta?.currency === 'USD') {
      holding.entry_price_usd = round4(pos.entryPrice);
    } else if (meta?.currency === 'DKK') {
      holding.entry_price_dkk = round4(pos.entryPrice);
    }

    // Find current value from last daily entry positions
    const posEntry = lastEntry.positions.find((p) => p.asset === symbol);
    if (posEntry) {
      holding.amount_eur = posEntry.value;
      holding.pnl_pct = posEntry.pnlPercent;
      if (posEntry.currentPriceEUR) holding.current_price_eur = posEntry.currentPriceEUR;
      if (posEntry.currentPriceUSD) holding.current_price_usd = posEntry.currentPriceUSD;
      if (posEntry.currentPriceDKK) holding.current_price_dkk = posEntry.currentPriceDKK;
    }

    holdings[symbol] = holding;
  }

  const portfolioJson = {
    last_updated: `${lastDate}T21:30:00.000Z`,
    holdings,
    totals: {
      balance_eur: lastEntry.balance.total,
      initial_eur: STARTING_CAPITAL,
      pnl_eur: round2(lastEntry.balance.total - STARTING_CAPITAL),
      pnl_pct: lastEntry.totalReturn,
    },
  };

  fs.writeFileSync(path.join(DATA_DIR, 'portfolio.json'), JSON.stringify(portfolioJson, null, 2));

  // Save summary
  const summary = {
    lastUpdated: lastDate,
    balance: lastEntry.balance.total,
    totalReturn: lastEntry.totalReturn,
    totalTrades: allTrades.length,
    buys: allTrades.filter((t) => t.action === 'BUY').length,
    sells: allTrades.filter((t) => t.action === 'SELL').length,
    positions: Object.keys(portfolio.positions).length,
    simulated: true,
  };
  fs.writeFileSync(path.join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(`\nSaved: ${dailyEntries.length} daily entries, ${allTrades.length} trades`);
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const { dryRun, verbose } = parseArgs();

  console.log('=== MakeMeRich Historical Simulation ===');
  console.log(`Period: ${GAME_START} to ${GAME_END}`);
  console.log(`Starting capital: EUR ${STARTING_CAPITAL}`);
  console.log('');

  const { dailyEntries, allTrades, portfolio } = simulate(verbose);

  const lastEntry = dailyEntries[dailyEntries.length - 1];
  const buys = allTrades.filter((t) => t.action === 'BUY');
  const sells = allTrades.filter((t) => t.action === 'SELL');

  console.log('\n=== Simulation Results ===');
  console.log(`Final balance: EUR ${lastEntry.balance.total.toFixed(2)}`);
  console.log(`Total return:  ${lastEntry.totalReturn >= 0 ? '+' : ''}${lastEntry.totalReturn}%`);
  console.log(`Trading days:  ${dailyEntries.length - 1}`);
  console.log(`Total trades:  ${allTrades.length} (${buys.length} buys, ${sells.length} sells)`);
  console.log(`Open positions: ${Object.keys(portfolio.positions).length}`);

  // Positions summary
  if (Object.keys(portfolio.positions).length > 0) {
    console.log('\nOpen positions:');
    for (const [sym, pos] of Object.entries(portfolio.positions)) {
      console.log(`  ${sym}: ${pos.units.toFixed(4)} units (entry: ${pos.entryPrice.toFixed(2)} on ${pos.entryDate})`);
    }
  }

  // Max drawdown
  let peak = STARTING_CAPITAL;
  let maxDrawdown = 0;
  for (const entry of dailyEntries) {
    if (entry.balance.total > peak) peak = entry.balance.total;
    const dd = ((peak - entry.balance.total) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }
  console.log(`\nMax drawdown:  -${maxDrawdown.toFixed(2)}%`);

  // Win rate
  const closedTrades = [];
  const openPositions = new Map();
  for (const trade of allTrades) {
    if (trade.action === 'BUY') {
      openPositions.set(trade.asset, trade.price);
    } else if (trade.action === 'SELL' && openPositions.has(trade.asset)) {
      const entryPrice = openPositions.get(trade.asset);
      closedTrades.push({ asset: trade.asset, entryPrice, exitPrice: trade.price, pnl: trade.price - entryPrice });
    }
  }
  const wins = closedTrades.filter((t) => t.pnl > 0).length;
  if (closedTrades.length > 0) {
    console.log(`Win rate:      ${((wins / closedTrades.length) * 100).toFixed(1)}% (${wins}/${closedTrades.length})`);
  }

  saveResults(dailyEntries, allTrades, portfolio, dryRun);
}

try {
  main();
} catch (e) {
  console.error('Error: ' + e.message);
  console.error(e.stack);
  process.exit(1);
}
