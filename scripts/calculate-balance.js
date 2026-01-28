#!/usr/bin/env node
/**
 * MakeMeRich - Balance Calculator
 * 
 * Calculates current portfolio value based on positions and current prices.
 * 
 * Usage:
 *   node scripts/calculate-balance.js [--date YYYY-MM-DD]
 * 
 * Input: Reads latest data/*.json file
 * Output: JSON with current values
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

// Fee structure
const FEES = {
  ETF: 0.001,      // 0.1%
  Stock: 0.001,    // 0.1%
  Crypto: 0.005,   // 0.5%
  Forex: 0.0002,   // 0.02% (spread)
  Bond: 0.001,     // 0.1%
  P2P: 0.01,       // 1%
  default: 0.005   // 0.5%
};

function getLatestDataFile() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error("No data files found");
  }
  
  return path.join(DATA_DIR, files[0]);
}

function checkRules(data) {
  const warnings = [];
  const { balance, positions, allocation } = data;
  
  if (positions) {
    for (const pos of positions) {
      const percentage = (pos.value / balance.total) * 100;
      if (percentage > 50) {
        warnings.push("WARNING: " + pos.asset + " exceeds 50% limit (" + percentage.toFixed(1) + "%)");
      }
      if (pos.pnlPercent <= -20) {
        warnings.push("STOP-LOSS: " + pos.asset + " down " + pos.pnlPercent + "%");
      }
      if (pos.pnlPercent >= 30) {
        warnings.push("TAKE-PROFIT: " + pos.asset + " up " + pos.pnlPercent + "% - consider taking 25% profits");
      }
    }
  }
  
  if (allocation && allocation.cash) {
    const cashPercentage = (allocation.cash / balance.total) * 100;
    if (cashPercentage < 5) {
      warnings.push("WARNING: Cash reserve below 5% (" + cashPercentage.toFixed(1) + "%)");
    }
  }
  
  if (balance.total < 1000) {
    warnings.push("CRITICAL: Balance below 1,000 EUR - switch to capital preservation");
  }
  
  return warnings;
}

async function main() {
  try {
    const latestFile = getLatestDataFile();
    console.log("Reading: " + path.basename(latestFile));
    
    const data = JSON.parse(fs.readFileSync(latestFile, "utf8"));
    
    console.log("\nCurrent Portfolio:");
    console.log("  Date: " + data.date);
    console.log("  Day: " + data.day);
    console.log("  Balance: " + data.balance.total.toFixed(2) + " EUR");
    
    if (data.positions && data.positions.length > 0) {
      console.log("\nPositions:");
      for (const pos of data.positions) {
        console.log("  " + pos.asset + ": " + (pos.value ? pos.value.toFixed(2) : "N/A") + " EUR");
      }
    }
    
    if (data.allocation) {
      console.log("\nAllocation:");
      for (const [asset, value] of Object.entries(data.allocation)) {
        const pct = (value / data.balance.total * 100).toFixed(1);
        console.log("  " + asset + ": " + value.toFixed(2) + " EUR (" + pct + "%)");
      }
    }
    
    const warnings = checkRules(data);
    if (warnings.length > 0) {
      console.log("\nWarnings:");
      warnings.forEach(w => console.log("  " + w));
    }
    
    console.log("\nDone");
    
  } catch (error) {
    console.error("Error: " + error.message);
    process.exit(1);
  }
}

main();
