#!/usr/bin/env node
/**
 * MakeMeRich - Portfolio Updater
 * 
 * Reads holdings from portfolio.json and updates with current prices.
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
    https.get(url, { headers: { 'User-Agent': 'MakeMeRich/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function fetchPrice(symbol) {
  try {
    if (symbol === 'BTC') {
      const data = await httpGet('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_change=true');
      const json = JSON.parse(data);
      return {
        priceUSD: json.bitcoin.usd,
        priceEUR: json.bitcoin.eur,
        change24h: json.bitcoin.usd_24h_change
      };
    }
    
    if (symbol === 'VOO') {
      // Try Yahoo Finance
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
      const data = await httpGet(url);
      const json = JSON.parse(data);
      const result = json.chart.result[0];
      const meta = result.meta;
      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const current = meta.regularMarketPrice;
      const change = prevClose ? ((current - prevClose) / prevClose * 100) : 0;
      return {
        priceUSD: current,
        change24h: change
      };
    }
    
    return null;
  } catch (e) {
    console.error(`Error fetching ${symbol}: ${e.message}`);
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
    return 0.92; // fallback
  }
}

async function main() {
  const { date, dryRun } = parseArgs();
  
  // Check for duplicate
  const entryPath = path.join(DATA_DIR, date + ".json");
  if (fs.existsSync(entryPath) && !dryRun) {
    console.log(`Entry for ${date} exists, updating...`);
  }
  
  console.log("Loading portfolio...");
  const portfolio = loadPortfolio();
  const lastEntry = getLastEntry();
  
  console.log("Fetching prices...\n");
  const eurUsd = await fetchEURUSD();
  console.log(`EUR/USD: ${eurUsd.toFixed(4)}`);
  
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
    if (!priceData) {
      console.warn(`Could not fetch price for ${asset}, using last known`);
      if (holding.amount_eur) {
        totalValue += holding.amount_eur;
        positions.push({
          asset,
          type: asset === 'BTC' ? 'Crypto' : 'ETF',
          value: holding.amount_eur,
          pnlPercent: holding.pnl_pct || 0
        });
      }
      continue;
    }
    
    let currentValueEUR;
    let units = holding.shares || holding.units;
    let entryPriceUSD = holding.entry_price_usd;
    
    if (asset === 'VOO') {
      const currentPriceUSD = priceData.priceUSD;
      currentValueEUR = units * currentPriceUSD * eurUsd;
      const entryValueEUR = units * entryPriceUSD * eurUsd;
      const pnlPct = ((currentValueEUR - entryValueEUR) / entryValueEUR * 100);
      
      console.log(`VOO: ${units} shares × $${currentPriceUSD.toFixed(2)} = €${currentValueEUR.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
      
      positions.push({
        asset: 'VOO',
        type: 'ETF',
        description: 'Vanguard S&P 500 ETF',
        units,
        entryPriceUSD,
        currentPriceUSD: priceData.priceUSD,
        value: parseFloat(currentValueEUR.toFixed(2)),
        pnlPercent: parseFloat(pnlPct.toFixed(2)),
        change24h: priceData.change24h
      });
      totalValue += currentValueEUR;
    }
    
    if (asset === 'BTC') {
      currentValueEUR = units * priceData.priceEUR;
      const entryValueEUR = units * entryPriceUSD * eurUsd;
      const pnlPct = ((currentValueEUR - entryValueEUR) / entryValueEUR * 100);
      
      console.log(`BTC: ${units} × $${priceData.priceUSD.toFixed(2)} = €${currentValueEUR.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);
      
      positions.push({
        asset: 'BTC',
        type: 'Crypto',
        description: 'Bitcoin',
        units,
        entryPriceUSD,
        currentPriceUSD: priceData.priceUSD,
        currentPriceEUR: priceData.priceEUR,
        value: parseFloat(currentValueEUR.toFixed(2)),
        pnlPercent: parseFloat(pnlPct.toFixed(2)),
        change24h: priceData.change24h
      });
      totalValue += currentValueEUR;
    }
  }
  
  const day = lastEntry ? lastEntry.day + 1 : 1;
  const prevBalance = lastEntry ? lastEntry.balance.total : STARTING_CAPITAL;
  const change = {
    absolute: parseFloat((totalValue - prevBalance).toFixed(2)),
    percentage: parseFloat(((totalValue - prevBalance) / prevBalance * 100).toFixed(2))
  };
  const totalReturn = ((totalValue - STARTING_CAPITAL) / STARTING_CAPITAL * 100);
  
  console.log("\n" + "=".repeat(50));
  console.log(`Day ${day} - ${date}`);
  console.log("=".repeat(50));
  console.log(`Balance: €${totalValue.toFixed(2)}`);
  console.log(`Daily change: ${change.percentage >= 0 ? '+' : ''}${change.percentage}%`);
  console.log(`Total return: ${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`);
  
  const entry = {
    date,
    day,
    balance: {
      total: parseFloat(totalValue.toFixed(2)),
      currency: "EUR"
    },
    change,
    totalReturn: parseFloat(totalReturn.toFixed(2)),
    positions,
    metadata: {
      generatedAt: new Date().toISOString(),
      eurUsd
    }
  };
  
  // Update portfolio.json with current values
  const updatedPortfolio = { ...portfolio };
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
    console.log("\n[DRY RUN] Would save entry to: " + entryPath);
    console.log(JSON.stringify(entry, null, 2));
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
