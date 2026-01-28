#!/usr/bin/env node
/**
 * MakeMeRich - Daily Entry Generator
 * 
 * Generates the daily JSON template.
 * 
 * Usage:
 *   node scripts/generate-entry.js --date 2026-01-28 --balance 5127.50
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace("--", "");
    params[key] = args[i + 1];
  }
  
  return params;
}

function getLastEntry() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[0]), "utf8"));
}

function checkDuplicateEntry(date) {
  const filename = date + ".json";
  const filepath = path.join(DATA_DIR, filename);
  return fs.existsSync(filepath);
}

function generateEntry(date, balance, positions) {
  const lastEntry = getLastEntry();
  const day = lastEntry ? lastEntry.day + 1 : 1;
  const prevBalance = lastEntry ? lastEntry.balance.total : 5000;
  
  const change = {
    absolute: Math.round((balance - prevBalance) * 100) / 100,
    percentage: Math.round(((balance - prevBalance) / prevBalance) * 10000) / 100
  };
  
  const allocation = {};
  let positionsTotal = 0;
  
  for (const pos of positions) {
    allocation[pos.asset] = pos.value;
    positionsTotal += pos.value;
  }
  allocation.cash = Math.round((balance - positionsTotal) * 100) / 100;
  
  return {
    date: date,
    day: day,
    balance: {
      total: balance,
      currency: "EUR"
    },
    change: change,
    positions: positions,
    allocation: allocation,
    trades: [],
    marketConditions: {},
    nextDayPlan: { action: "HOLD", reasoning: "Update with actual analysis" },
    metadata: {
      generatedAt: new Date().toISOString(),
      agentVersion: "HAL-1.0"
    }
  };
}

async function main() {
  const args = parseArgs();
  
  if (!args.date) {
    console.log("Usage: node generate-entry.js --date YYYY-MM-DD [--balance XXXX.XX]");
    console.log("\nThis script helps generate daily entries. Edit the output as needed.");
    process.exit(0);
  }
  
  if (checkDuplicateEntry(args.date)) {
    console.error("ERROR: Entry for " + args.date + " already exists! One entry per day rule.");
    process.exit(1);
  }
  
  const lastEntry = getLastEntry();
  const balance = parseFloat(args.balance) || (lastEntry ? lastEntry.balance.total : 5000);
  
  const entry = generateEntry(
    args.date,
    balance,
    lastEntry ? lastEntry.positions : []
  );
  
  console.log("Generated entry template:\n");
  console.log(JSON.stringify(entry, null, 2));
  console.log("\nEdit this and save to data/" + args.date + ".json");
}

main();
