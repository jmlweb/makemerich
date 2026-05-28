#!/usr/bin/env node
/**
 * MakeMeRich - Summary Generator
 *
 * Single source of truth for the two end-of-day summary artifacts:
 *   - data/summary.json        (monthly totals + all-time, for README/dashboard)
 *   - data/.daily-summary.txt  (Telegram-style notification block)
 *
 * Derived deterministically from the daily files (data/YYYY-MM-DD.json) and the
 * trade log (data/trades/YYYY-MM.json). Run at daily close, after the portfolio
 * has been updated.
 *
 * Semantics (documented so they cannot drift):
 *   month.start_balance = balance.total of the FIRST daily file in that month
 *   month.end_balance   = balance.total of the LAST  daily file in that month
 *   month.pnl_eur       = end - start ; pnl_pct = pnl_eur / start * 100
 *   month.trades_count  = number of BUY/SELL records that month (deposits excluded)
 *   all_time.current_balance = balance.total of the latest daily file
 *
 * Usage: node scripts/generate-summary.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const TRADES_DIR = path.join(DATA_DIR, "trades");
const STARTING_CAPITAL = 5000.0;

const round2 = (n) => parseFloat(n.toFixed(2));

function loadDailyFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));
}

function tradesCount(month) {
  const file = path.join(TRADES_DIR, `${month}.json`);
  if (!fs.existsSync(file)) return 0;
  const loaded = JSON.parse(fs.readFileSync(file, "utf8"));
  const arr = Array.isArray(loaded) ? loaded : loaded.trades || [];
  return arr.filter((t) => String(t.action).toLowerCase() !== "deposit").length;
}

function buildSummary(days) {
  const byMonth = new Map();
  for (const d of days) {
    const m = d.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(d);
  }

  const months = [...byMonth.keys()].sort().map((m) => {
    const entries = byMonth.get(m);
    const start = entries[0].balance.total;
    const end = entries[entries.length - 1].balance.total;
    return {
      month: m,
      start_balance: round2(start),
      end_balance: round2(end),
      pnl_eur: round2(end - start),
      pnl_pct: round2(((end - start) / start) * 100),
      trades_count: tradesCount(m),
    };
  });

  const latest = days[days.length - 1];
  const current = latest.balance.total;

  return {
    lastUpdated: latest.date,
    months,
    all_time: {
      start_date: days[0].date,
      total_deposited: STARTING_CAPITAL,
      total_withdrawn: 0,
      current_balance: round2(current),
      pnl_eur: round2(current - STARTING_CAPITAL),
      pnl_pct: round2(((current - STARTING_CAPITAL) / STARTING_CAPITAL) * 100),
    },
  };
}

function buildDailyText(latest) {
  const totalReturn = ((latest.balance.total - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
  const best = latest.positions.reduce((a, b) => (a.pnlPercent > b.pnlPercent ? a : b));
  const worst = latest.positions.reduce((a, b) => (a.pnlPercent < b.pnlPercent ? a : b));
  const dayPct = latest.change.percentage;
  const plan = latest.nextDayPlan?.action || "HOLD";
  const sgn = (n) => (n >= 0 ? "+" : "");
  return `
📊 MakeMeRich Day ${latest.day}
💰 Balance: €${latest.balance.total.toFixed(2)}
${dayPct >= 0 ? "🟢" : "🔴"} Today: ${sgn(dayPct)}${dayPct.toFixed(2)}%
📈 Total: ${sgn(totalReturn)}${totalReturn.toFixed(2)}%

🏆 Best: ${best.asset} (${sgn(best.pnlPercent)}${best.pnlPercent.toFixed(1)}%)
📉 Worst: ${worst.asset} (${worst.pnlPercent.toFixed(1)}%)

🎯 Plan: ${plan}
`;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const days = loadDailyFiles();
  if (days.length === 0) {
    console.error("No daily files found.");
    process.exit(1);
  }

  const summary = buildSummary(days);
  const dailyText = buildDailyText(days[days.length - 1]);

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(dailyText);
    return;
  }

  fs.writeFileSync(path.join(DATA_DIR, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  fs.writeFileSync(path.join(DATA_DIR, ".daily-summary.txt"), dailyText);
  console.log(
    `summary.json updated: ${summary.months.length} months, balance €${summary.all_time.current_balance} (${summary.all_time.pnl_pct}%)`
  );
  console.log(`.daily-summary.txt updated: Day ${days[days.length - 1].day}`);
}

main();
