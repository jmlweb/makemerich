#!/usr/bin/env node
/**
 * MakeMeRich - Price Fetcher
 * 
 * Fetches real-time prices from free APIs:
 * - ETFs/Stocks: Yahoo Finance (via query1.finance.yahoo.com)
 * - Reads portfolio.json to determine which assets to fetch
 * 
 * Usage:
 *   node scripts/fetch-prices.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Asset metadata (for Yahoo symbols)
const ASSET_CONFIG = {
  // European UCITS ETFs (legal in Spain, tax-efficient for EU residents)
  VWCE: { yahoo: "VWCE.DE", currency: "EUR", description: "Vanguard FTSE All-World UCITS (Acc)" },
  SXR8: { yahoo: "SXR8.DE", currency: "EUR", description: "iShares Core S&P 500 UCITS (Acc)" },
  CSPX: { yahoo: "CSPX.L", currency: "USD", description: "iShares Core S&P 500 UCITS (Acc)" },
  EUNL: { yahoo: "EUNL.DE", currency: "EUR", description: "iShares Core MSCI World UCITS" },
  EQQQ: { yahoo: "EQQQ.DE", currency: "EUR", description: "Invesco NASDAQ-100 UCITS" },
  MEUD: { yahoo: "MEUD.PA", currency: "EUR", description: "iShares MSCI Europe UCITS" },
  SGLD: { yahoo: "SGLD.L", currency: "USD", description: "Invesco Physical Gold ETC" },
  // Crypto (legal in Spain, regulated exchanges)
  BTC: { yahoo: "BTC-USD", currency: "USD", description: "Bitcoin" },
  ETH: { yahoo: "ETH-USD", currency: "USD", description: "Ethereum" },
  SOL: { yahoo: "SOL-USD", currency: "USD", description: "Solana" },
  // Legacy US ETFs (reference only - not legally accessible to EU retail)
  VOO: { yahoo: "VOO", currency: "USD", description: "Vanguard S&P 500 ETF (US)" },
  GLD: { yahoo: "GLD", currency: "USD", description: "SPDR Gold Trust (US)" },
  QQQ: { yahoo: "QQQ", currency: "USD", description: "Invesco NASDAQ-100 (US)" }
};

// Market indices for reference
const INDICES = {
  SP500: { yahoo: "^GSPC" },
  NASDAQ: { yahoo: "^IXIC" },
  GOLD: { yahoo: "GC=F" },
  // European indices
  IBEX35: { yahoo: "^IBEX", region: "EU" },
  EUROSTOXX50: { yahoo: "^STOXX50E", region: "EU" },
  DAX: { yahoo: "^GDAXI", region: "EU" }
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "MakeMeRich/1.0" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("JSON parse error: " + e.message));
        }
      });
    }).on("error", reject);
  });
}

async function fetchYahooPrice(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
  try {
    const data = await httpsGet(url);
    const result = data.chart?.result?.[0];
    if (!result) throw new Error("No data for " + symbol);
    
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const lastClose = quotes?.close?.filter(c => c != null).pop() || meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    
    return {
      symbol,
      price: lastClose,
      previousClose: prevClose,
      change: prevClose ? ((lastClose - prevClose) / prevClose * 100) : 0,
      currency: meta.currency
    };
  } catch (e) {
    console.error(`Yahoo error for ${symbol}: ${e.message}`);
    return { symbol, error: e.message };
  }
}

async function fetchEURUSD() {
  const url = "https://api.exchangerate-api.com/v4/latest/USD";
  try {
    const data = await httpsGet(url);
    return data.rates?.EUR || 0.92;
  } catch (e) {
    console.error("Exchange rate error: " + e.message);
    return 0.92;
  }
}

function loadPortfolio() {
  const portfolioPath = path.join(__dirname, "..", "data", "portfolio.json");
  if (fs.existsSync(portfolioPath)) {
    return JSON.parse(fs.readFileSync(portfolioPath, "utf8"));
  }
  return null;
}

async function main() {
  console.log("Fetching current prices...\n");
  
  const prices = {};
  const eurUsd = await fetchEURUSD();
  console.log(`EUR/USD: ${eurUsd.toFixed(4)}\n`);
  
  // Load portfolio to see what we need to fetch
  const portfolio = loadPortfolio();
  const assetsToFetch = portfolio 
    ? Object.keys(portfolio.holdings).filter(a => a !== 'CASH' && ASSET_CONFIG[a])
    : ['VOO', 'GLD'];
  
  // Fetch asset prices
  for (const asset of assetsToFetch) {
    const config = ASSET_CONFIG[asset];
    if (!config) continue;
    
    const data = await fetchYahooPrice(config.yahoo);
    if (!data.error) {
      const priceUSD = data.price;
      const priceEUR = priceUSD * eurUsd;
      prices[asset] = {
        priceUSD,
        priceEUR,
        change: data.change.toFixed(2)
      };
      console.log(`${asset}: $${priceUSD.toFixed(2)} / €${priceEUR.toFixed(2)} (${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%)`);
    } else {
      console.log(`${asset}: ERROR - ${data.error}`);
    }
  }
  
  // Fetch indices
  console.log("\nMarket Indices:");
  for (const [name, config] of Object.entries(INDICES)) {
    const data = await fetchYahooPrice(config.yahoo);
    if (!data.error) {
      console.log(`${name}: ${data.price.toFixed(2)} (${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%)`);
      prices[name] = { value: data.price, change: data.change.toFixed(2) };
    }
  }
  
  // Save to temp file
  const outPath = path.join(__dirname, "..", "data", ".prices-latest.json");
  fs.writeFileSync(outPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    eurUsd,
    prices
  }, null, 2));
  
  console.log(`\nPrices saved to ${outPath}`);
}

main().catch(e => {
  console.error("Fatal error: " + e.message);
  process.exit(1);
});
