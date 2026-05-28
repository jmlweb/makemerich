#!/usr/bin/env node
/**
 * MakeMeRich - Data Integrity Validator
 *
 * Re-runnable validation over all daily files, the trade log, and portfolio.json.
 * Checks:
 *   1. Temporal continuity   — day counter contiguous, dates strictly increasing
 *   2. Intra-day accounting   — balance.total == Σ positions[].value (tolerance €0.05)
 *   3. Trade validity         — every trades file is a canonical bare array w/ required fields
 *   4. Portfolio sync         — portfolio.json totals/holdings match the latest daily file
 *   5. Trades↔holdings recon  — unit change on a SAME-ticker position across consecutive
 *                               days must have a matching trade dated in the window.
 *                               Asset add/remove = rebalance boundary (INFO, not failure).
 *
 * Exit 0 = all PASS, exit 1 = at least one FAIL.
 * Usage: node scripts/validate-data.js
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const TRADES_DIR = path.join(DATA_DIR, "trades");
const TOL = 0.05;

let fails = 0;
let infos = 0;
const fail = (m) => { console.log(`  ❌ ${m}`); fails++; };
const info = (m) => { console.log(`  ℹ️  ${m}`); infos++; };
const ok = (m) => console.log(`  ✅ ${m}`);

function dailyFiles() {
  return fs.readdirSync(DATA_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
}
function loadTrades(month) {
  const f = path.join(TRADES_DIR, `${month}.json`);
  if (!fs.existsSync(f)) return [];
  const l = JSON.parse(fs.readFileSync(f, "utf8"));
  return Array.isArray(l) ? l : l.trades || [];
}
function allTrades() {
  return fs.readdirSync(TRADES_DIR)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .flatMap((f) => loadTrades(f.replace(".json", "")));
}

const files = dailyFiles();
const days = files.map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));

// 1. Temporal continuity
console.log("\n[1] Temporal continuity");
{
  let bad = 0;
  for (let i = 1; i < days.length; i++) {
    if (days[i].day !== days[i - 1].day + 1) {
      fail(`day counter jump: ${days[i - 1].date} (day ${days[i - 1].day}) -> ${days[i].date} (day ${days[i].day})`);
      bad++;
    }
    if (days[i].date <= days[i - 1].date) {
      fail(`dates not increasing: ${days[i - 1].date} -> ${days[i].date}`);
      bad++;
    }
  }
  if (!bad) ok(`${days.length} files, day ${days[0].day}..${days[days.length - 1].day} contiguous`);
}

// 2. Intra-day accounting
console.log("\n[2] Intra-day accounting (balance.total == Σ positions)");
{
  let bad = 0;
  for (const d of days) {
    const sum = d.positions.reduce((s, p) => s + p.value, 0);
    if (Math.abs(sum - d.balance.total) > TOL) {
      fail(`${d.date}: Σpositions €${sum.toFixed(2)} != balance €${d.balance.total.toFixed(2)} (Δ ${(sum - d.balance.total).toFixed(2)})`);
      bad++;
    }
  }
  if (!bad) ok(`all ${days.length} daily files balance within €${TOL}`);
}

// 3. Trade validity
console.log("\n[3] Trade validity (canonical schema)");
{
  let bad = 0;
  for (const f of fs.readdirSync(TRADES_DIR).filter((x) => /^\d{4}-\d{2}\.json$/.test(x))) {
    const raw = JSON.parse(fs.readFileSync(path.join(TRADES_DIR, f), "utf8"));
    if (!Array.isArray(raw)) { fail(`${f}: not a bare array (legacy shape)`); bad++; continue; }
    raw.forEach((t, i) => {
      const isDep = String(t.action).toLowerCase() === "deposit";
      if (!t.date || !["BUY", "SELL", "deposit"].includes(t.action)) { fail(`${f}[${i}]: bad date/action`); bad++; }
      if (!t.asset) { fail(`${f}[${i}]: missing asset`); bad++; }
      if (typeof t.amount_eur !== "number") { fail(`${f}[${i}]: missing amount_eur`); bad++; }
      if (!isDep && typeof t.units !== "number") { fail(`${f}[${i}]: missing units`); bad++; }
      if (!isDep && t.price_usd === undefined && t.price_eur === undefined) { fail(`${f}[${i}]: missing price_usd/price_eur`); bad++; }
    });
  }
  if (!bad) ok("all trade files canonical with required fields");
}

// 4. Portfolio ↔ latest-daily sync
console.log("\n[4] Portfolio ↔ latest-daily sync");
{
  const pf = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "portfolio.json"), "utf8"));
  const latest = days[days.length - 1];
  let bad = 0;
  if (Math.abs(pf.totals.balance_eur - latest.balance.total) > TOL) {
    fail(`balance mismatch: portfolio €${pf.totals.balance_eur} vs daily €${latest.balance.total}`); bad++;
  }
  const pfAssets = new Set(Object.keys(pf.holdings));
  const dailyAssets = new Set(latest.positions.map((p) => p.asset));
  for (const a of pfAssets) if (!dailyAssets.has(a)) { fail(`asset ${a} in portfolio.json but not latest daily`); bad++; }
  for (const a of dailyAssets) if (!pfAssets.has(a)) { fail(`asset ${a} in latest daily but not portfolio.json`); bad++; }
  for (const p of latest.positions) {
    if (p.asset === "CASH") continue;
    const h = pf.holdings[p.asset];
    if (h && Math.abs((h.units || 0) - p.units) > 1e-6) { fail(`${p.asset}: units portfolio ${h.units} vs daily ${p.units}`); bad++; }
    if (h && Math.abs((h.amount_eur || 0) - p.value) > TOL) { fail(`${p.asset}: value portfolio €${h.amount_eur} vs daily €${p.value}`); bad++; }
  }
  if (!bad) ok(`portfolio.json matches ${latest.date} (€${latest.balance.total}, ${pfAssets.size} holdings)`);
}

// 5. Trades ↔ holdings reconciliation (same-ticker continuity)
console.log("\n[5] Trades ↔ holdings reconciliation");
{
  const trades = allTrades();
  const tradesByAsset = new Map();
  for (const t of trades) {
    if (!tradesByAsset.has(t.asset)) tradesByAsset.set(t.asset, []);
    tradesByAsset.get(t.asset).push(t);
  }
  let bad = 0;
  for (let i = 1; i < days.length; i++) {
    const prev = days[i - 1], cur = days[i];
    const prevPos = new Map(prev.positions.map((p) => [p.asset, p]));
    const curPos = new Map(cur.positions.map((p) => [p.asset, p]));
    for (const [asset, cp] of curPos) {
      if (asset === "CASH") continue;
      const pp = prevPos.get(asset);
      if (!pp) continue; // asset added — rebalance boundary, checked below
      if (Math.abs((cp.units || 0) - (pp.units || 0)) <= 1e-6) continue; // unchanged
      // unit delta on a same-ticker position: require a trade dated in (prevDate .. curDate]
      const ts = (tradesByAsset.get(asset) || []).filter((t) => t.date >= prev.date && t.date <= cur.date);
      if (ts.length === 0) {
        fail(`${asset} units ${pp.units} -> ${cp.units} between ${prev.date} and ${cur.date}, no trade logged`);
        bad++;
      }
    }
    // rebalance boundaries (assets added/removed) — informational only
    const added = [...curPos.keys()].filter((a) => a !== "CASH" && !prevPos.has(a));
    const removed = [...prevPos.keys()].filter((a) => a !== "CASH" && !curPos.has(a));
    if (added.length || removed.length) {
      info(`${prev.date}->${cur.date} rebalance: +[${added.join(",")}] -[${removed.join(",")}] (seed restructuring, no per-trade records)`);
    }
  }
  if (!bad) ok("no unexplained same-ticker unit changes");
}

console.log(`\n${"=".repeat(50)}`);
console.log(fails === 0 ? `✅ ALL CHECKS PASS (${infos} informational)` : `❌ ${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
