#!/usr/bin/env node
/**
 * MakeMeRich - Historical OHLCV Fetcher
 *
 * Fetches daily OHLCV data from Yahoo Finance for all portfolio + watchlist assets.
 * Caches results in data/history/{SYMBOL}.json. Skips refetch if cache is fresh.
 *
 * Usage:
 *   node scripts/fetch-history.js [--symbol ETH] [--range 1y] [--force]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const PORTFOLIO_PATH = path.join(DATA_DIR, 'portfolio.json');

// Merged asset config from fetch-prices.js + update-portfolio.js
const ASSET_CONFIG = {
  // European UCITS ETFs
  VWCE: { yahoo: 'VWCE.DE', currency: 'EUR' },
  SXR8: { yahoo: 'SXR8.DE', currency: 'EUR' },
  CSPX: { yahoo: 'CSPX.L', currency: 'USD' },
  EQQQ: { yahoo: 'EQQQ.DE', currency: 'EUR' },
  EUNL: { yahoo: 'EUNL.DE', currency: 'EUR' },
  MEUD: { yahoo: 'MEUD.PA', currency: 'EUR' },
  SGLD: { yahoo: 'SGLD.L', currency: 'USD' },
  '4GLD': { yahoo: '4GLD.DE', currency: 'EUR' },
  XEON: { yahoo: 'XEON.DE', currency: 'EUR' },
  DXS3: { yahoo: 'DXS3.DE', currency: 'EUR' },
  NATO: { yahoo: 'NATO.L', currency: 'USD' },
  // Crypto
  BTC: { yahoo: 'BTC-USD', currency: 'USD' },
  ETH: { yahoo: 'ETH-USD', currency: 'USD' },
  SOL: { yahoo: 'SOL-USD', currency: 'USD' },
};

// Indices for market context signals
const INDEX_CONFIG = {
  SP500: { yahoo: '^GSPC', currency: 'USD' },
  VIX: { yahoo: '^VIX', currency: 'USD' },
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    symbol: args.find((_, i) => args[i - 1] === '--symbol') || null,
    range: args.find((_, i) => args[i - 1] === '--range') || '1y',
    force: args.includes('--force'),
  };
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 15000);
    https.get(url, { headers: { 'User-Agent': 'MakeMeRich/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error: ' + e.message));
        }
      });
    }).on('error', (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCacheFresh(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!cache.data || cache.data.length === 0) return false;
    const lastDate = cache.data[cache.data.length - 1].date;
    const today = new Date().toISOString().split('T')[0];
    return lastDate === today;
  } catch {
    return false;
  }
}

async function fetchHistory(symbol, yahooSymbol, currency, range) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=${range}`;

  const json = await httpsGet(url);
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No data returned');

  const timestamps = result.timestamp;
  const quotes = result.indicators?.quote?.[0];
  if (!timestamps || !quotes) throw new Error('Missing OHLCV data');

  const data = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quotes.open?.[i];
    const h = quotes.high?.[i];
    const l = quotes.low?.[i];
    const c = quotes.close?.[i];
    const v = quotes.volume?.[i];

    // Skip days with null values (market closed, missing data)
    if (c == null) continue;

    const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    data.push({
      date,
      open: o != null ? +o.toFixed(4) : c,
      high: h != null ? +h.toFixed(4) : c,
      low: l != null ? +l.toFixed(4) : c,
      close: +c.toFixed(4),
      volume: v || 0,
    });
  }

  return {
    symbol,
    yahooSymbol,
    currency,
    lastFetched: new Date().toISOString(),
    data,
  };
}

function getSymbolsToFetch(filterSymbol) {
  const symbols = {};

  // Portfolio holdings
  if (fs.existsSync(PORTFOLIO_PATH)) {
    const portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf8'));
    for (const asset of Object.keys(portfolio.holdings)) {
      if (asset === 'CASH') continue;
      if (ASSET_CONFIG[asset]) {
        symbols[asset] = ASSET_CONFIG[asset];
      }
    }
  }

  // Watchlist (hardcoded from SIGNALS.md)
  const watchlist = ['EQQQ', 'SOL', 'SXR8', 'VWCE'];
  for (const asset of watchlist) {
    if (ASSET_CONFIG[asset]) symbols[asset] = ASSET_CONFIG[asset];
  }

  // Indices for market context
  for (const [name, config] of Object.entries(INDEX_CONFIG)) {
    symbols[name] = config;
  }

  if (filterSymbol) {
    const config = symbols[filterSymbol] || ASSET_CONFIG[filterSymbol] || INDEX_CONFIG[filterSymbol];
    if (!config) {
      console.error(`Unknown symbol: ${filterSymbol}`);
      process.exit(1);
    }
    return { [filterSymbol]: config };
  }

  return symbols;
}

async function main() {
  const { symbol, range, force } = parseArgs();
  const symbols = getSymbolsToFetch(symbol);
  const names = Object.keys(symbols);

  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

  console.log(`Fetching ${range} history for ${names.length} assets...\n`);

  let fetched = 0;
  let skipped = 0;
  let errors = 0;

  for (const [name, config] of Object.entries(symbols)) {
    const cachePath = path.join(HISTORY_DIR, `${name}.json`);

    if (!force && isCacheFresh(cachePath)) {
      skipped++;
      continue;
    }

    try {
      const result = await fetchHistory(name, config.yahoo, config.currency, range);
      fs.writeFileSync(cachePath, JSON.stringify(result, null, 2));
      console.log(`  ${name}: ${result.data.length} days fetched`);
      fetched++;
    } catch (e) {
      console.error(`  ${name}: ERROR - ${e.message}`);
      errors++;
    }

    // Rate limiting
    await sleep(500);
  }

  console.log(`\nDone: ${fetched} fetched, ${skipped} cached, ${errors} errors`);
}

main().catch((e) => {
  console.error('Fatal: ' + e.message);
  process.exit(1);
});
