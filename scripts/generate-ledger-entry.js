#!/usr/bin/env node
/**
 * MakeMeRich - LEDGER Entry Generator
 *
 * Generates the data-heavy portion of a LEDGER.md daily close entry.
 * Leaves Analysis and Decision as placeholders for Claude to fill.
 *
 * Reads: portfolio.json, .prices-latest.json, .signals-latest.json,
 *        .quant-signals-latest.json, .trade-orders.json, trades/YYYY-MM.json,
 *        and the previous day's JSON for day-over-day change.
 *
 * Usage:
 *   node scripts/generate-ledger-entry.js [--date YYYY-MM-DD]
 *
 * Outputs markdown to stdout. Also writes to data/.ledger-draft.md
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function load(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPreviousDayFile(today) {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f < `${today}.json`)
    .sort()
    .reverse();
  return files.length > 0 ? load(path.join(DATA_DIR, files[0])) : null;
}

function formatNum(n, decimals = 2) {
  if (n === null || n === undefined) return "n/a";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function sign(n) {
  return n >= 0 ? "+" : "";
}

function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find((_, i) => args[i - 1] === "--date");
  const today = dateArg || new Date().toISOString().split("T")[0];

  const portfolio = load(path.join(DATA_DIR, "portfolio.json"));
  const prices = load(path.join(DATA_DIR, ".prices-latest.json"));
  const signals = load(path.join(DATA_DIR, ".signals-latest.json"));
  const quant = load(path.join(DATA_DIR, ".quant-signals-latest.json"));
  const orders = load(path.join(DATA_DIR, ".trade-orders.json"));
  const prevDay = getPreviousDayFile(today);

  if (!portfolio || !prices) {
    console.error("ERROR: portfolio.json or .prices-latest.json not found");
    process.exit(1);
  }

  const balance = portfolio.totals.balance_eur;
  const pnlPct = portfolio.totals.pnl_pct;
  const eurUsd = prices.eurUsd;

  // Day number — from today's data file if it exists, else count files
  const todayFile = load(path.join(DATA_DIR, `${today}.json`));
  const dayNumber = todayFile ? todayFile.day : fs.readdirSync(DATA_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).length;

  // Day change
  let dayChangeAbs = 0, dayChangePct = 0, prevBalance = balance;
  if (prevDay) {
    prevBalance = prevDay.balance.total;
    dayChangeAbs = balance - prevBalance;
    dayChangePct = (dayChangeAbs / prevBalance) * 100;
  }

  // Date formatting
  const dateObj = new Date(today + "T12:00:00Z");
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dateFormatted = `${monthNames[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}, ${dateObj.getUTCFullYear()}`;

  // Build trades section
  const month = today.slice(0, 7);
  const tradesFile = path.join(DATA_DIR, "trades", `${month}.json`);
  const allTrades = load(tradesFile) || [];
  const todayTrades = allTrades.filter(t => t.date === today);

  // --- Generate markdown ---
  const lines = [];

  // Header
  lines.push(`### Day ${dayNumber} — ${dateFormatted} 21:30 CET`);
  lines.push("");
  lines.push(`**Balance:** €${formatNum(balance)} | **Total Return:** ${sign(pnlPct)}${pnlPct.toFixed(1)}%`);
  lines.push(`**Day P&L:** ${sign(dayChangeAbs)}€${formatNum(Math.abs(dayChangeAbs))} (${sign(dayChangePct)}${dayChangePct.toFixed(1)}%) vs Day ${dayNumber - 1} (€${formatNum(prevBalance)})`);
  lines.push("");

  // Prices at close
  lines.push("**Prices at close:**");
  const holdingKeys = Object.keys(portfolio.holdings).filter(k => k !== "CASH");
  for (const sym of holdingKeys) {
    const h = portfolio.holdings[sym];
    const p = prices.prices[sym];
    const change = p ? `${sign(parseFloat(p.change))}${p.change}% 24h` : "";

    if (h.current_price_usd) {
      const stopStr = h.stop_loss_usd ? ` — stop $${formatNum(h.stop_loss_usd)}` : "";
      lines.push(`- ${sym}: $${formatNum(h.current_price_usd)} / €${formatNum(h.current_price_usd * eurUsd)} (${change})${stopStr}`);
    } else {
      const stopStr = h.stop_loss_eur ? ` — stop €${formatNum(h.stop_loss_eur)}` : "";
      lines.push(`- ${sym}: €${formatNum(h.current_price_eur)} (${change})${stopStr}`);
    }
  }

  // Market indices
  lines.push("");
  lines.push("**Market context:**");
  lines.push(`- EUR/USD: ${eurUsd.toFixed(4)}`);
  for (const idx of ["SP500", "NASDAQ", "GOLD", "IBEX35", "EUROSTOXX50", "DAX"]) {
    const p = prices.prices[idx];
    if (p && p.value) {
      lines.push(`- ${idx}: ${formatNum(p.value)} (${sign(parseFloat(p.change))}${p.change}%)`);
    }
  }
  lines.push("");

  // Performance table
  lines.push("**Performance by asset (vs entry):**");
  lines.push("| Asset | Value | % Portfolio | P&L entry | 24h |");
  lines.push("|-------|-------|-------------|-----------|-----|");
  const sortedHoldings = Object.entries(portfolio.holdings)
    .sort(([, a], [, b]) => (b.amount_eur || 0) - (a.amount_eur || 0));
  for (const [sym, h] of sortedHoldings) {
    const pct = ((h.amount_eur / balance) * 100).toFixed(1);
    if (sym === "CASH") {
      lines.push(`| CASH | €${formatNum(h.amount_eur)} | ${pct}% | — | — |`);
    } else {
      const p = prices.prices[sym];
      const change24h = p ? `${sign(parseFloat(p.change))}${p.change}%` : "n/a";
      const pnl = h.pnl_pct !== undefined ? `${sign(h.pnl_pct)}${h.pnl_pct.toFixed(1)}%` : "n/a";
      lines.push(`| ${sym} | €${formatNum(h.amount_eur)} | ${pct}% | ${pnl} | ${change24h} |`);
    }
  }
  lines.push("");

  // Trades
  if (todayTrades.length > 0) {
    lines.push("**Trades:**");
    for (const t of todayTrades) {
      const priceKey = t.price_eur !== undefined ? "EUR" : "USD";
      const priceVal = t.price_eur || t.price_usd;
      lines.push(`- **${t.action} ${t.asset}**: ${t.units} units @ ${priceKey} ${formatNum(priceVal)} = EUR ${formatNum(t.amount_eur)} (fee EUR ${formatNum(t.fee_eur)})`);
      if (t.reason) lines.push(`  Reason: ${t.reason}`);
    }
  } else {
    lines.push("**Trades today:** None.");
  }
  lines.push("");

  // Quant signals summary
  if (quant) {
    lines.push("**Quantitative signals (generate-quant-signals.js):**");
    lines.push(`- Market regime: ${quant.marketRegime.regime.toUpperCase()} (SP500 ${sign(quant.marketRegime.sp500vsSma50Pct)}${quant.marketRegime.sp500vsSma50Pct.toFixed(2)}% vs SMA50, VIX ${quant.marketRegime.vix})`);
    if (quant.summary) {
      for (const [signal, symbols] of Object.entries(quant.summary)) {
        if (symbols.length > 0) {
          lines.push(`- ${signal}: ${symbols.join(", ")}`);
        }
      }
    }
    lines.push("");
  }

  // Signals/alerts
  if (signals && signals.alerts && signals.alerts.length > 0) {
    lines.push("**Active alerts:**");
    for (const a of signals.alerts) {
      if (a.type === "STOP_LOSS") {
        lines.push(`- ${a.asset}: stop ${a.currency} ${formatNum(a.triggerPrice)} (${a.distancePct.toFixed(1)}% away)`);
      } else if (a.type === "PORTFOLIO_DRAWDOWN") {
        lines.push(`- Portfolio drawdown: ${a.pnlPct.toFixed(1)}%`);
      }
    }
    lines.push("");
  }

  // Placeholder for Claude
  lines.push("**Analysis:**");
  lines.push("{{ANALYSIS}}");
  lines.push("");
  lines.push("**{{DECISION}}**");
  lines.push("");
  lines.push("---");
  lines.push("");

  const output = lines.join("\n");

  // Write draft
  const draftPath = path.join(DATA_DIR, ".ledger-draft.md");
  fs.writeFileSync(draftPath, output);

  console.log(output);
  console.error(`Draft saved to: ${draftPath}`);
}

main();
