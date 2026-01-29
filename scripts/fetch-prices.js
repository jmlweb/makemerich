#!/usr/bin/env node
/**
 * MakeMeRich - Price Fetcher
 * 
 * Fetches real-time prices from free APIs:
 * - ETFs/Stocks: Yahoo Finance (via query1.finance.yahoo.com)
 * - Crypto: CoinGecko API (free, no key needed)
 * 
 * Usage:
 *   node scripts/fetch-prices.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Asset configuration
const ASSETS = {
  // ETFs - Yahoo Finance symbols
  CSPX: { type: "ETF", yahoo: "CSPX.L", currency: "GBP" },
  EQQQ: { type: "ETF", yahoo: "EQQQ.DE", currency: "GBP" },
  // Crypto - CoinGecko IDs
  BTC: { type: "Crypto", coingecko: "bitcoin" },
  ETH: { type: "Crypto", coingecko: "ethereum" }
};

// Market indices for reference
const INDICES = {
  SP500: { yahoo: "^GSPC" },
  NASDAQ: { yahoo: "^IXIC" }
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
      change: prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : null,
      currency: meta.currency
    };
  } catch (e) {
    console.error(`Yahoo error for ${symbol}: ${e.message}`);
    return { symbol, error: e.message };
  }
}

async function fetchCryptoPrice(id) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=eur,usd&include_24hr_change=true`;
  try {
    const data = await httpsGet(url);
    if (!data[id]) throw new Error("No data for " + id);
    
    return {
      id,
      priceEUR: data[id].eur,
      priceUSD: data[id].usd,
      change24h: data[id].eur_24h_change?.toFixed(2)
    };
  } catch (e) {
    console.error(`CoinGecko error for ${id}: ${e.message}`);
    return { id, error: e.message };
  }
}

async function fetchGBPtoEUR() {
  // Use ECB reference rate via a free API
  const url = "https://api.exchangerate-api.com/v4/latest/GBP";
  try {
    const data = await httpsGet(url);
    return data.rates?.EUR || 1.17; // fallback
  } catch (e) {
    console.error("Exchange rate error: " + e.message);
    return 1.17; // reasonable fallback
  }
}

async function main() {
  console.log("Fetching current prices...\n");
  
  const prices = {};
  const gbpToEur = await fetchGBPtoEUR();
  console.log(`GBP/EUR: ${gbpToEur.toFixed(4)}\n`);
  
  // Fetch ETF prices
  for (const [asset, config] of Object.entries(ASSETS)) {
    if (config.yahoo) {
      const data = await fetchYahooPrice(config.yahoo);
      if (!data.error) {
        const priceEUR = config.currency === "GBP" ? data.price * gbpToEur : data.price;
        prices[asset] = {
          price: priceEUR,
          priceOriginal: data.price,
          currency: config.currency,
          change: data.change + "%"
        };
        console.log(`${asset}: €${priceEUR.toFixed(2)} (${data.change}%)`);
      }
    }
  }
  
  // Fetch crypto prices
  const cryptoIds = Object.entries(ASSETS)
    .filter(([_, c]) => c.coingecko)
    .map(([_, c]) => c.coingecko);
  
  for (const [asset, config] of Object.entries(ASSETS)) {
    if (config.coingecko) {
      const data = await fetchCryptoPrice(config.coingecko);
      if (!data.error) {
        prices[asset] = {
          price: data.priceEUR,
          priceUSD: data.priceUSD,
          change: data.change24h + "%"
        };
        console.log(`${asset}: €${data.priceEUR.toFixed(2)} / $${data.priceUSD.toFixed(2)} (${data.change24h}%)`);
      }
    }
  }
  
  // Fetch indices
  console.log("\nMarket Indices:");
  for (const [name, config] of Object.entries(INDICES)) {
    const data = await fetchYahooPrice(config.yahoo);
    if (!data.error) {
      console.log(`${name}: ${data.price.toFixed(2)} (${data.change}%)`);
      prices[name] = { value: data.price, change: data.change + "%" };
    }
  }
  
  // Save to temp file
  const outPath = path.join(__dirname, "..", "data", ".prices-latest.json");
  fs.writeFileSync(outPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    gbpToEur,
    prices
  }, null, 2));
  
  console.log(`\nPrices saved to ${outPath}`);
}

main().catch(e => {
  console.error("Fatal error: " + e.message);
  process.exit(1);
});
