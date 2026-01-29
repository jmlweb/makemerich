#!/usr/bin/env node
/**
 * MakeMeRich - Portfolio Updater
 * 
 * Generates daily entry with real prices.
 * 
 * Usage:
 *   node scripts/update-portfolio.js [--date YYYY-MM-DD] [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DATA_DIR = path.join(__dirname, "..", "data");
const INITIAL_INVESTMENTS = {
  CSPX: 1750.00,
  EQQQ: 1250.00,
  BTC: 1000.00,
  ETH: 500.00
};
const CASH = 500.00;
const STARTING_CAPITAL = 5000.00;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    date: args.find((_, i) => args[i-1] === "--date") || new Date().toISOString().split("T")[0],
    dryRun: args.includes("--dry-run")
  };
}

function getLastEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), "utf8"));
}

function getAllEntries() {
  return fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));
}

function fetchPrices() {
  console.log("Fetching latest prices...\n");
  execSync("node " + path.join(__dirname, "fetch-prices.js"), { stdio: "inherit" });
  
  const pricesFile = path.join(DATA_DIR, ".prices-latest.json");
  if (!fs.existsSync(pricesFile)) {
    throw new Error("Prices file not found. Run fetch-prices.js first.");
  }
  return JSON.parse(fs.readFileSync(pricesFile, "utf8"));
}

function calculatePositions(pricesData, lastEntry) {
  const { prices } = pricesData;
  const positions = [];
  
  for (const [asset, invested] of Object.entries(INITIAL_INVESTMENTS)) {
    const priceInfo = prices[asset];
    if (!priceInfo || !priceInfo.price) {
      console.warn(`Warning: No price for ${asset}, using last known value`);
      const lastPos = lastEntry?.positions?.find(p => p.asset === asset);
      if (lastPos) positions.push(lastPos);
      continue;
    }
    
    // Calculate units from Day 1 investment
    // We need to know the initial price - get from Day 1 data or calculate
    const lastPos = lastEntry?.positions?.find(p => p.asset === asset);
    let units, avgPrice;
    
    if (lastPos && lastPos.units) {
      units = lastPos.units;
      avgPrice = lastPos.avgPrice;
    } else {
      // Estimate units from last known value and current price ratio
      // This is imprecise - ideally Day 1 should have units
      const lastValue = lastPos?.value || invested;
      units = lastValue / priceInfo.price;
      avgPrice = invested / units;
    }
    
    const currentValue = units * priceInfo.price;
    const pnl = currentValue - invested;
    const pnlPercent = (pnl / invested) * 100;
    
    positions.push({
      asset,
      type: asset === "BTC" || asset === "ETH" ? "Crypto" : "ETF",
      description: getAssetDescription(asset),
      invested: invested,
      units: parseFloat(units.toFixed(6)),
      avgPrice: parseFloat(avgPrice.toFixed(4)),
      currentPrice: parseFloat(priceInfo.price.toFixed(4)),
      value: parseFloat(currentValue.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2))
    });
  }
  
  return positions;
}

function getAssetDescription(asset) {
  const descriptions = {
    CSPX: "iShares Core S&P 500 UCITS",
    EQQQ: "Invesco NASDAQ-100 UCITS",
    BTC: "Bitcoin",
    ETH: "Ethereum"
  };
  return descriptions[asset] || asset;
}

function calculateBestWorstDay(entries) {
  let best = { day: null, change: -Infinity };
  let worst = { day: null, change: Infinity };
  
  for (const entry of entries) {
    if (entry.change && entry.change.percentage !== undefined) {
      if (entry.change.percentage > best.change) {
        best = { day: entry.day, change: entry.change.percentage };
      }
      if (entry.change.percentage < worst.change) {
        worst = { day: entry.day, change: entry.change.percentage };
      }
    }
  }
  
  return { best, worst };
}

function generateEntry(date, positions, pricesData, lastEntry) {
  const { prices } = pricesData;
  const day = lastEntry ? lastEntry.day + 1 : 1;
  const prevBalance = lastEntry ? lastEntry.balance.total : STARTING_CAPITAL;
  
  const positionsTotal = positions.reduce((sum, p) => sum + p.value, 0);
  const totalBalance = positionsTotal + CASH;
  
  const change = {
    absolute: parseFloat((totalBalance - prevBalance).toFixed(2)),
    percentage: parseFloat(((totalBalance - prevBalance) / prevBalance * 100).toFixed(2))
  };
  
  const allocation = {};
  for (const pos of positions) {
    allocation[pos.asset] = pos.value;
  }
  allocation.cash = CASH;
  
  return {
    date,
    day,
    balance: {
      total: parseFloat(totalBalance.toFixed(2)),
      currency: "EUR"
    },
    change,
    positions,
    allocation,
    trades: [],
    marketConditions: {
      sp500: prices.SP500 ? { value: prices.SP500.value, change: prices.SP500.change } : {},
      nasdaq: prices.NASDAQ ? { value: prices.NASDAQ.value, change: prices.NASDAQ.change } : {},
      bitcoin: prices.BTC ? { value: prices.BTC.priceUSD, currency: "USD", change: prices.BTC.change } : {},
      ethereum: prices.ETH ? { value: prices.ETH.priceUSD, currency: "USD", change: prices.ETH.change } : {}
    },
    nextDayPlan: {
      action: "HOLD",
      changes: [],
      reasoning: "Auto-generated. Review and update reasoning."
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      dataSources: ["Yahoo Finance", "CoinGecko", "ExchangeRate-API"],
      agentVersion: "HAL-1.0",
      pricesFetchedAt: pricesData.fetchedAt
    }
  };
}

async function main() {
  const { date, dryRun } = parseArgs();
  
  // Check for duplicate
  const entryPath = path.join(DATA_DIR, date + ".json");
  if (fs.existsSync(entryPath)) {
    console.error(`ERROR: Entry for ${date} already exists!`);
    process.exit(1);
  }
  
  const lastEntry = getLastEntry();
  const pricesData = fetchPrices();
  const positions = calculatePositions(pricesData, lastEntry);
  const entry = generateEntry(date, positions, pricesData, lastEntry);
  
  console.log("\n" + "=".repeat(50));
  console.log(`Day ${entry.day} - ${date}`);
  console.log("=".repeat(50));
  console.log(`Balance: €${entry.balance.total.toFixed(2)} (${entry.change.percentage >= 0 ? "+" : ""}${entry.change.percentage}%)`);
  console.log("\nPositions:");
  for (const pos of positions) {
    console.log(`  ${pos.asset}: €${pos.value.toFixed(2)} (${pos.pnlPercent >= 0 ? "+" : ""}${pos.pnlPercent}% total)`);
  }
  
  if (dryRun) {
    console.log("\n[DRY RUN] Would save to: " + entryPath);
    console.log(JSON.stringify(entry, null, 2));
  } else {
    fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2));
    console.log("\nSaved to: " + entryPath);
  }
}

main().catch(e => {
  console.error("Error: " + e.message);
  process.exit(1);
});
