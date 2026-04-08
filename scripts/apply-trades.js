#!/usr/bin/env node
/**
 * MakeMeRich - Trade Applier
 *
 * Reads binding trade orders from .trade-orders.json and applies them
 * to portfolio.json. Also appends trades to data/trades/YYYY-MM.json.
 *
 * This is the mechanical step that was previously done by Claude via Edit.
 *
 * Usage:
 *   node scripts/apply-trades.js [--dry-run]
 *
 * Exit codes:
 *   0 — trades applied (or no orders to apply)
 *   1 — error
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolio.json");
const ORDERS_FILE = path.join(DATA_DIR, ".trade-orders.json");
const TRADES_DIR = path.join(DATA_DIR, "trades");
const PRICES_FILE = path.join(DATA_DIR, ".prices-latest.json");

function load(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function save(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function getFeeRate(symbol) {
  if (["BTC", "ETH", "SOL"].includes(symbol)) return 0.001;
  return 0.001; // 0.1% default for ETFs/stocks
}

function getAssetCurrency(symbol) {
  const usdAssets = ["ETH", "BTC", "SOL", "NATO", "CSPX", "SGLD"];
  return usdAssets.includes(symbol) ? "USD" : "EUR";
}

function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Load orders
  if (!fs.existsSync(ORDERS_FILE)) {
    console.log("No trade orders file found. Nothing to apply.");
    process.exit(0);
  }

  const orders = load(ORDERS_FILE);
  if (!orders.orders || orders.orders.length === 0) {
    console.log("No orders to execute.");
    process.exit(0);
  }

  // Load portfolio and prices
  const portfolio = load(PORTFOLIO_FILE);
  const prices = load(PRICES_FILE);
  const eurUsd = prices.eurUsd;

  const today = new Date().toISOString().split("T")[0];
  const tradesLog = [];
  let cashEur = portfolio.holdings.CASH.amount_eur;

  console.log(`\nApplying ${orders.orders.length} trade orders...`);
  console.log(`Cash available: EUR ${cashEur.toFixed(2)}\n`);

  for (const order of orders.orders) {
    const { action, symbol, estimatedValueEur, estimatedFeeEur, stopPrice, reason } = order;
    const currency = getAssetCurrency(symbol);

    // Get current price
    let priceEur, priceUsd;
    const priceData = prices.prices[symbol];
    if (!priceData) {
      console.log(`  SKIP ${symbol}: no price data available`);
      continue;
    }
    if (priceData.priceEUR !== undefined) {
      priceEur = priceData.priceEUR;
      priceUsd = priceData.priceUSD;
    } else if (priceData.priceUSD !== undefined) {
      priceUsd = priceData.priceUSD;
      priceEur = priceData.priceUSD * eurUsd;
    } else {
      console.log(`  SKIP ${symbol}: unexpected price format`);
      continue;
    }

    if (action === "BUY") {
      // Check cash
      const costEur = estimatedValueEur + estimatedFeeEur;
      if (costEur > cashEur + 0.01) {
        console.log(`  SKIP BUY ${symbol}: insufficient cash (need EUR ${costEur.toFixed(2)}, have EUR ${cashEur.toFixed(2)})`);
        continue;
      }

      const units = estimatedValueEur / priceEur;
      cashEur -= costEur;

      // Add or update holding
      const existing = portfolio.holdings[symbol];
      if (existing) {
        // Average into existing position
        const oldValue = existing.units * (currency === "USD" ? existing.current_price_usd : existing.current_price_eur);
        const newUnits = existing.units + units;
        existing.units = parseFloat(newUnits.toFixed(6));
        if (currency === "USD") {
          existing.entry_price_usd = parseFloat(((oldValue + estimatedValueEur / eurUsd) / newUnits).toFixed(4));
          existing.current_price_usd = priceUsd;
          existing.amount_eur = parseFloat((newUnits * priceUsd * eurUsd).toFixed(2));
        } else {
          existing.entry_price_eur = parseFloat(((oldValue + estimatedValueEur) / newUnits).toFixed(4));
          existing.current_price_eur = priceEur;
          existing.amount_eur = parseFloat((newUnits * priceEur).toFixed(2));
        }
        if (stopPrice && !existing.stop_loss_eur && !existing.stop_loss_usd) {
          if (currency === "USD") existing.stop_loss_usd = stopPrice;
          else existing.stop_loss_eur = stopPrice;
        }
      } else {
        // New position
        const holding = { units: parseFloat(units.toFixed(6)) };
        if (currency === "USD") {
          holding.entry_price_usd = parseFloat(priceUsd.toFixed(4));
          holding.current_price_usd = priceUsd;
          holding.amount_eur = parseFloat((units * priceUsd * eurUsd).toFixed(2));
          holding.pnl_pct = 0;
          if (stopPrice) holding.stop_loss_usd = stopPrice;
        } else {
          holding.entry_price_eur = parseFloat(priceEur.toFixed(4));
          holding.current_price_eur = priceEur;
          holding.amount_eur = parseFloat((units * priceEur).toFixed(2));
          holding.pnl_pct = 0;
          if (stopPrice) holding.stop_loss_eur = stopPrice;
        }
        portfolio.holdings[symbol] = holding;
      }

      // Recalculate pnl_pct
      const h = portfolio.holdings[symbol];
      if (currency === "USD") {
        h.pnl_pct = parseFloat((((h.current_price_usd - h.entry_price_usd) / h.entry_price_usd) * 100).toFixed(2));
      } else {
        h.pnl_pct = parseFloat((((h.current_price_eur - h.entry_price_eur) / h.entry_price_eur) * 100).toFixed(2));
      }

      console.log(`  BUY ${symbol}: ${units.toFixed(4)} units @ ${currency} ${(currency === "USD" ? priceUsd : priceEur).toFixed(2)} = EUR ${estimatedValueEur.toFixed(2)} (fee EUR ${estimatedFeeEur.toFixed(2)})`);

      tradesLog.push({
        date: today,
        time: new Date().toISOString().split("T")[1].slice(0, 5) + " UTC",
        action: "BUY",
        asset: symbol,
        units: parseFloat(units.toFixed(6)),
        [`price_${currency.toLowerCase()}`]: parseFloat((currency === "USD" ? priceUsd : priceEur).toFixed(4)),
        amount_eur: parseFloat(estimatedValueEur.toFixed(2)),
        fee_eur: parseFloat(estimatedFeeEur.toFixed(2)),
        reason,
        session: "makemerich-2130"
      });
    } else if (action === "SELL") {
      const holding = portfolio.holdings[symbol];
      if (!holding) {
        console.log(`  SKIP SELL ${symbol}: not in portfolio`);
        continue;
      }

      // Determine units to sell
      const priceInNative = currency === "USD" ? priceUsd : priceEur;
      let unitsToSell = estimatedValueEur / priceEur;
      if (unitsToSell >= holding.units * 0.99) {
        // Full liquidation
        unitsToSell = holding.units;
      }

      const proceeds = unitsToSell * priceEur;
      const fee = proceeds * getFeeRate(symbol);
      cashEur += proceeds - fee;

      console.log(`  SELL ${symbol}: ${unitsToSell.toFixed(4)} units @ ${currency} ${priceInNative.toFixed(2)} = EUR ${proceeds.toFixed(2)} (fee EUR ${fee.toFixed(2)})`);

      tradesLog.push({
        date: today,
        time: new Date().toISOString().split("T")[1].slice(0, 5) + " UTC",
        action: "SELL",
        asset: symbol,
        units: parseFloat(unitsToSell.toFixed(6)),
        [`price_${currency.toLowerCase()}`]: parseFloat(priceInNative.toFixed(4)),
        amount_eur: parseFloat(proceeds.toFixed(2)),
        fee_eur: parseFloat(fee.toFixed(2)),
        reason,
        session: "makemerich-2130"
      });

      if (unitsToSell >= holding.units * 0.99) {
        delete portfolio.holdings[symbol];
      } else {
        holding.units = parseFloat((holding.units - unitsToSell).toFixed(6));
        holding.amount_eur = parseFloat((holding.units * priceEur).toFixed(2));
      }
    }
  }

  // Update cash and totals
  portfolio.holdings.CASH.amount_eur = parseFloat(cashEur.toFixed(2));
  const totalBalance = Object.values(portfolio.holdings).reduce((sum, h) => sum + (h.amount_eur || 0), 0);
  portfolio.totals.balance_eur = parseFloat(totalBalance.toFixed(2));
  portfolio.totals.pnl_eur = parseFloat((totalBalance - portfolio.totals.initial_eur).toFixed(2));
  portfolio.totals.pnl_pct = parseFloat((((totalBalance - portfolio.totals.initial_eur) / portfolio.totals.initial_eur) * 100).toFixed(2));
  portfolio.last_updated = new Date().toISOString();

  if (dryRun) {
    console.log("\n[DRY RUN] Would write:\n");
    console.log("portfolio.json:", JSON.stringify(portfolio.totals, null, 2));
    console.log("trades:", JSON.stringify(tradesLog, null, 2));
    process.exit(0);
  }

  // Save portfolio
  save(PORTFOLIO_FILE, portfolio);
  console.log(`\nPortfolio updated: EUR ${totalBalance.toFixed(2)} (${portfolio.totals.pnl_pct}%)`);

  // Append to trades log
  if (tradesLog.length > 0) {
    const month = today.slice(0, 7);
    const tradesFile = path.join(TRADES_DIR, `${month}.json`);
    let existing = [];
    if (fs.existsSync(tradesFile)) {
      existing = load(tradesFile);
    }
    existing.push(...tradesLog);
    save(tradesFile, existing);
    console.log(`Trades appended to: ${tradesFile}`);
  }

  // Output summary for downstream scripts
  const summary = {
    tradesExecuted: tradesLog.length,
    trades: tradesLog.map(t => `${t.action} ${t.asset}: ${t.units} units @ EUR ${t.amount_eur}`),
    newBalance: totalBalance,
    newPnl: portfolio.totals.pnl_pct
  };
  console.log("\n" + JSON.stringify(summary));
}

main();
