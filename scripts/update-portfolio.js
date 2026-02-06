#!/usr/bin/env node
/**
 * MakeMeRich - Portfolio Updater
 * 
 * Reads holdings from portfolio.json and updates with current prices.
 * Supports: UCITS ETFs (EUR/USD), Crypto, and ETCs.
 * 
 * Usage:
 *   node scripts/update-portfolio.js [--date YYYY-MM-DD] [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const DATA_DIR = path.join(__dirname, "..", "data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolio.json");
const STARTING_CAPITAL = 5000.00;

// Asset descriptions and Yahoo symbols
const ASSET_INFO = {
  // UCITS ETFs (legal in Spain)
  VWCE: { yahoo: "VWCE.DE", currency: "EUR", description: "Vanguard All-World UCITS", type: "ETF" },
  SXR8: { yahoo: "SXR8.DE", currency: "EUR", description: "iShares S&P 500 UCITS", type: "ETF" },
  CSPX: { yahoo: "CSPX.L", currency: "USD", description: "iShares S&P 500 UCITS", type: "ETF" },
  EQQQ: { yahoo: "EQQQ.DE", currency: "EUR", description: "Invesco NASDAQ-100 UCITS", type: "ETF" },
  EUNL: { yahoo: "EUNL.DE", currency: "EUR", description: "iShares MSCI World UCITS", type: "ETF" },
  SGLD: { yahoo: "SGLD.L", currency: "USD", description: "Invesco Physical Gold ETC", type: "ETC" },
  // Crypto
  BTC: { yahoo: "BTC-USD", currency: "USD", description: "Bitcoin", type: "Crypto" },
  ETH: { yahoo: "ETH-USD", currency: "USD", description: "Ethereum", type: "Crypto" },
  SOL: { yahoo: "SOL-USD", currency: "USD", description: "Solana", type: "Crypto" },
  // Legacy US ETFs (reference only)
  VOO: { yahoo: "VOO", currency: "USD", description: "Vanguard S&P 500 ETF", type: "ETF" },
  GLD: { yahoo: "GLD", currency: "USD", description: "SPDR Gold Trust", type: "ETF" },
  QQQ: { yahoo: "QQQ", currency: "USD", description: "Invesco NASDAQ-100", type: "ETF" }
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    date: args.find((_, i) => args[i-1] === "--date") || new Date().toISOString().split("T")[0],
    dryRun: args.includes("--dry-run")
  };
}

function loadPortfolio() {
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    throw new Error("portfolio.json not found");
  }
  return JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf8"));
}

function getLastEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), "utf8"));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    https.get(url, { headers: { 'User-Agent': 'MakeMeRich/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        clearTimeout(timeout);
        resolve(data);
      });
    }).on('error', (e) => {
      clearTimeout(timeout);
      reject(e);
    });
  });
}

async function fetchYahooPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
    const data = await httpGet(url);
    const json = JSON.parse(data);
    const result = json.chart?.result?.[0];
    if (!result) throw new Error("No data");
    
    const meta = result.meta;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const current = meta.regularMarketPrice;
    const change = prevClose ? ((current - prevClose) / prevClose * 100) : 0;
    
    return {
      price: current,
      currency: meta.currency,
      change24h: change
    };
  } catch (e) {
    console.error(`Yahoo error for ${symbol}: ${e.message}`);
    return null;
  }
}

async function fetchEURUSD() {
  try {
    const data = await httpGet('https://api.exchangerate-api.com/v4/latest/USD');
    const json = JSON.parse(data);
    return json.rates.EUR;
  } catch (e) {
    console.error('Error fetching EUR/USD rate:', e.message);
    return 0.848; // fallback
  }
}

async function main() {
  const { date, dryRun } = parseArgs();
  
  const entryPath = path.join(DATA_DIR, date + ".json");
  const isUpdate = fs.existsSync(entryPath);
  if (isUpdate) {
    console.log(`Updating entry for ${date}...`);
  }
  
  console.log("Loading portfolio...");
  const portfolio = loadPortfolio();
  
  console.log("Fetching prices...\n");
  const eurUsd = await fetchEURUSD();
  console.log(`EUR/USD: ${eurUsd.toFixed(4)}\n`);
  
  const positions = [];
  let totalValue = 0;
  
  // Process holdings
  for (const [asset, holding] of Object.entries(portfolio.holdings)) {
    if (asset === 'CASH') {
      const cashValue = holding.amount_eur;
      totalValue += cashValue;
      positions.push({
        asset: 'CASH',
        type: 'Cash',
        value: cashValue,
        pnlPercent: 0
      });
      console.log(`CASH: €${cashValue.toFixed(2)}`);
      continue;
    }
    
    const info = ASSET_INFO[asset];
    if (!info) {
      console.warn(`⚠ Unknown asset: ${asset}`);
      continue;
    }
    
    const priceData = await fetchYahooPrice(info.yahoo);
    const units = holding.shares || holding.units;
    
    // Determine entry price and currency
    const entryPriceEUR = holding.entry_price_eur;
    const entryPriceUSD = holding.entry_price_usd;
    const isEurAsset = info.currency === "EUR";
    
    if (!priceData) {
      console.warn(`⚠ Could not fetch ${asset}, using last known value`);
      const lastValue = holding.amount_eur;
      totalValue += lastValue;
      positions.push({
        asset,
        type: info.type,
        description: info.description,
        units,
        value: parseFloat(lastValue.toFixed(2)),
        pnlPercent: holding.pnl_pct || 0,
        stale: true
      });
      continue;
    }
    
    // Calculate value in EUR
    let currentValueEUR, pnlPct;
    
    if (isEurAsset) {
      // EUR-denominated asset (e.g., VWCE, SXR8)
      const currentPriceEUR = priceData.price;
      currentValueEUR = units * currentPriceEUR;
      pnlPct = entryPriceEUR ? ((currentPriceEUR - entryPriceEUR) / entryPriceEUR * 100) : 0;
      
      console.log(`${asset}: ${units.toFixed(4)} × €${currentPriceEUR.toFixed(2)} = €${currentValueEUR.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
      
      positions.push({
        asset,
        type: info.type,
        description: info.description,
        units,
        entryPriceEUR,
        currentPriceEUR,
        value: parseFloat(currentValueEUR.toFixed(2)),
        pnlPercent: parseFloat(pnlPct.toFixed(2)),
        change24h: priceData.change24h
      });
      
      // Update portfolio
      holding.current_price_eur = currentPriceEUR;
      holding.amount_eur = parseFloat(currentValueEUR.toFixed(2));
      holding.pnl_pct = parseFloat(pnlPct.toFixed(2));
    } else {
      // USD-denominated asset (e.g., SGLD, BTC, ETH)
      const currentPriceUSD = priceData.price;
      currentValueEUR = units * currentPriceUSD * eurUsd;
      pnlPct = entryPriceUSD ? ((currentPriceUSD - entryPriceUSD) / entryPriceUSD * 100) : 0;
      
      console.log(`${asset}: ${units.toFixed(4)} × $${currentPriceUSD.toFixed(2)} = €${currentValueEUR.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
      
      positions.push({
        asset,
        type: info.type,
        description: info.description,
        units,
        entryPriceUSD,
        currentPriceUSD,
        value: parseFloat(currentValueEUR.toFixed(2)),
        pnlPercent: parseFloat(pnlPct.toFixed(2)),
        change24h: priceData.change24h
      });
      
      // Update portfolio
      holding.current_price_usd = currentPriceUSD;
      holding.amount_eur = parseFloat(currentValueEUR.toFixed(2));
      holding.pnl_pct = parseFloat(pnlPct.toFixed(2));
    }
    
    totalValue += currentValueEUR;
  }
  
  // Get day number
  const lastEntry = getLastEntry();
  const day = isUpdate && lastEntry ? lastEntry.day : (lastEntry ? lastEntry.day + 1 : 1);
  
  const prevBalance = lastEntry && !isUpdate ? lastEntry.balance.total : STARTING_CAPITAL;
  const dailyChange = isUpdate ? 
    { absolute: 0, percentage: 0 } :
    {
      absolute: parseFloat((totalValue - prevBalance).toFixed(2)),
      percentage: parseFloat(((totalValue - prevBalance) / prevBalance * 100).toFixed(2))
    };
  const totalReturn = ((totalValue - STARTING_CAPITAL) / STARTING_CAPITAL * 100);
  
  console.log("\n" + "=".repeat(50));
  console.log(`Day ${day} - ${date}`);
  console.log("=".repeat(50));
  console.log(`Balance: €${totalValue.toFixed(2)}`);
  console.log(`Total return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  
  const entry = {
    date,
    day,
    balance: {
      total: parseFloat(totalValue.toFixed(2)),
      currency: "EUR"
    },
    change: dailyChange,
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    positions,
    metadata: {
      generatedAt: new Date().toISOString(),
      eurUsd
    }
  };
  
  // Update portfolio.json with current values
  portfolio.last_updated = new Date().toISOString();
  portfolio.totals = {
    balance_eur: parseFloat(totalValue.toFixed(2)),
    initial_eur: STARTING_CAPITAL,
    pnl_eur: parseFloat((totalValue - STARTING_CAPITAL).toFixed(2)),
    pnl_pct: parseFloat(totalReturn.toFixed(2))
  };
  
  if (dryRun) {
    console.log("\n[DRY RUN] Would save to: " + entryPath);
  } else {
    fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2));
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
    console.log("\nSaved to: " + entryPath);
    console.log("Updated: " + PORTFOLIO_FILE);
  }
}

main().catch(e => {
  console.error("Error: " + e.message);
  process.exit(1);
});
