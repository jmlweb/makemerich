/**
 * MakeMeRich - Technical Indicators Library
 *
 * Pure math functions for computing technical indicators.
 * No I/O, no dependencies. Required by generate-quant-signals.js and backtest.js.
 *
 * All functions return arrays of the same length as input,
 * with null for periods where insufficient data exists.
 */

/**
 * Simple Moving Average
 * @param {number[]} values - Price series
 * @param {number} period - Lookback period
 * @returns {(number|null)[]}
 */
function sma(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    result[i] = sum / period;
  }
  return result;
}

/**
 * Exponential Moving Average
 * Seeded from SMA of the first `period` values.
 * @param {number[]} values - Price series
 * @param {number} period - Lookback period
 * @returns {(number|null)[]}
 */
function ema(values, period) {
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const k = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * Relative Strength Index (Wilder's smoothing)
 * @param {number[]} values - Price series (typically closing prices)
 * @param {number} [period=14] - Lookback period
 * @returns {(number|null)[]}
 */
function rsi(values, period = 14) {
  const result = new Array(values.length).fill(null);
  if (values.length < period + 1) return result;

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  // First average gain/loss from simple average
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  // Wilder's smoothing for subsequent values
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs2);
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param {number[]} values - Price series
 * @param {number} [fast=12] - Fast EMA period
 * @param {number} [slow=26] - Slow EMA period
 * @param {number} [signal=9] - Signal line EMA period
 * @returns {{ macdLine: (number|null)[], signalLine: (number|null)[], histogram: (number|null)[] }}
 */
function macd(values, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);

  const macdLine = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine[i] = emaFast[i] - emaSlow[i];
    }
  }

  // Signal line = EMA of MACD line (only over non-null values)
  const macdValues = [];
  const macdIndices = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] !== null) {
      macdValues.push(macdLine[i]);
      macdIndices.push(i);
    }
  }

  const signalEma = ema(macdValues, signal);
  const signalLine = new Array(values.length).fill(null);
  const histogram = new Array(values.length).fill(null);

  for (let j = 0; j < macdIndices.length; j++) {
    const i = macdIndices[j];
    if (signalEma[j] !== null) {
      signalLine[i] = signalEma[j];
      histogram[i] = macdLine[i] - signalEma[j];
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands
 * @param {number[]} values - Price series
 * @param {number} [period=20] - SMA period
 * @param {number} [stdDevMultiplier=2] - Standard deviation multiplier
 * @returns {{ upper: (number|null)[], middle: (number|null)[], lower: (number|null)[] }}
 */
function bollingerBands(values, period = 20, stdDevMultiplier = 2) {
  const middle = sma(values, period);
  const upper = new Array(values.length).fill(null);
  const lower = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    if (middle[i] === null) continue;

    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - middle[i];
      sumSq += diff * diff;
    }
    const stdDev = Math.sqrt(sumSq / period);

    upper[i] = middle[i] + stdDevMultiplier * stdDev;
    lower[i] = middle[i] - stdDevMultiplier * stdDev;
  }

  return { upper, middle, lower };
}

/**
 * Average True Range (Wilder's smoothing)
 * @param {number[]} highs - High prices
 * @param {number[]} lows - Low prices
 * @param {number[]} closes - Closing prices
 * @param {number} [period=14] - Lookback period
 * @returns {(number|null)[]}
 */
function atr(highs, lows, closes, period = 14) {
  const len = closes.length;
  const result = new Array(len).fill(null);
  if (len < period + 1) return result;

  // True Range
  const tr = new Array(len).fill(null);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < len; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }

  // First ATR = simple average of first `period` TRs (starting from index 1)
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  result[period] = sum / period;

  // Wilder's smoothing
  for (let i = period + 1; i < len; i++) {
    result[i] = (result[i - 1] * (period - 1) + tr[i]) / period;
  }

  return result;
}

module.exports = { sma, ema, rsi, macd, bollingerBands, atr };
