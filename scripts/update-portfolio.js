#!/usr/bin/env node
/**
 * MakeMeRich - Portfolio Updater
 * 
 * Reads holdings from portfolio.json and updates with current prices.
 * Supports: VOO, GLD, QQQ, VTI, BTC, ETH and other Yahoo Finance symbols.
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

// Asset descriptions
const ASSET_INFO = {
  VOO: { description: "Vanguard S&P 500 ETF", type: "ETF" },
  GLD: { description: "SPDR Gold Trust", type: "ETF" },
  QQQ: { description: "Invesco Nasdaq-100 ETF", type: "ETF" },
  VTI: { description: "Vanguard Total Stock Market ETF", type: "ETF" },
  BTC: { description: "Bitcoin", type: "Crypto" },
  ETH: { description: "Ethereum", type: "Crypto" }
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

function getDayNumber() {
  // Count trading days since start (Jan 28, 2026)
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort();
  return files.length + 1;
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
      priceUSD: current,
      change24h: change
    };
  } catch (e) {
    console.error(`Yahoo error for ${symbol}: ${e.message}`);
    return null;
  }
}

async function fetchCryptoPrice(symbol) {
  try {
    const id = symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : symbol.toLowerCase();
    const data = await httpGet(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,eur&include_24hr_change=true`);
    const json = JSON.parse(data);
    if (!json[id]) throw new Error("No data");
    
    return {
      priceUSD: json[id].usd,
      priceEUR: json[id].eur,
      change24h: json[id].usd_24h_change
    };
  } catch (e) {
    console.error(`CoinGecko error for ${symbol}: ${e.message}`);
    return null;
  }
}

async function fetchPrice(symbol) {
  const info = ASSET_INFO[symbol] || { type: "ETF" };
  
  if (info.type === "Crypto") {
    return await fetchCryptoPrice(symbol);
  } else {
    return await fetchYahooPrice(symbol);
  }
}

async function fetchEURUSD() {
  try {
    const data = await httpGet('https://api.exchangerate-api.com/v4/latest/USD');
    const json = JSON.parse(data);
    return json.rates.EUR;
  } catch (e) {
    console.error('Error fetching EUR/USD rate:', e.message);
    return 0.843; // fallback
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
    
    const priceData = await fetchPrice(asset);
    const info = ASSET_INFO[asset] || { description: asset, type: "ETF" };
    const units = holding.shares || holding.units;
    const entryPriceUSD = holding.entry_price_usd;
    
    if (!priceData) {
      console.warn(`⚠ Could not fetch ${asset}, using last known value`);
      const lastValue = holding.amount_eur || (units * entryPriceUSD * eurUsd);
      totalValue += lastValue;
      positions.push({
        asset,
        type: info.type,
        description: info.description,
        units,
        entryPriceUSD,
        currentPriceUSD: holding.current_price_usd || entryPriceUSD,
        value: parseFloat(lastValue.toFixed(2)),
        pnlPercent: holding.pnl_pct || 0,
        stale: true
      });
      continue;
    }
    
    const currentPriceUSD = priceData.priceUSD;
    const currentValueEUR = units * currentPriceUSD * eurUsd;
    const entryValueEUR = units * entryPriceUSD * eurUsd;
    const pnlPct = ((currentPriceUSD - entryPriceUSD) / entryPriceUSD * 100);
    
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
    
    totalValue += currentValueEUR;
  }
  
  // Get day number from existing files or LEDGER
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
  const updatedPortfolio = JSON.parse(JSON.stringify(portfolio));
  updatedPortfolio.last_updated = new Date().toISOString();
  updatedPortfolio.totals = {
    balance_eur: parseFloat(totalValue.toFixed(2)),
    initial_eur: STARTING_CAPITAL,
    pnl_eur: parseFloat((totalValue - STARTING_CAPITAL).toFixed(2)),
    pnl_pct: parseFloat(totalReturn.toFixed(2))
  };
  
  for (const pos of positions) {
    if (pos.asset !== 'CASH' && updatedPortfolio.holdings[pos.asset]) {
      updatedPortfolio.holdings[pos.asset].current_price_usd = pos.currentPriceUSD;
      updatedPortfolio.holdings[pos.asset].amount_eur = pos.value;
      updatedPortfolio.holdings[pos.asset].pnl_pct = pos.pnlPercent;
    }
  }
  
  if (dryRun) {
    console.log("\n[DRY RUN] Would save to: " + entryPath);
  } else {
    fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2));
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(updatedPortfolio, null, 2));
    console.log("\nSaved to: " + entryPath);
    console.log("Updated: " + PORTFOLIO_FILE);
  }
}

main().catch(e => {
  console.error("Error: " + e.message);
  process.exit(1);
});
