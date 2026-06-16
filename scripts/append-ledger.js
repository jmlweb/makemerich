#!/usr/bin/env node
/**
 * MakeMeRich - LEDGER Appender
 *
 * Inserts a new entry at the TOP of the Daily Log section in LEDGER.md
 * (reverse-chronological order) and updates the Summary table.
 *
 * Usage:
 *   node scripts/append-ledger.js --entry <path-to-entry.md>
 *   node scripts/append-ledger.js --entry data/.ledger-draft.md
 *   cat entry.md | node scripts/append-ledger.js --stdin
 *
 * The entry file should be a markdown fragment starting with ### Day ...
 */

const fs = require("fs");
const path = require("path");

const LEDGER_FILE = path.join(__dirname, "..", "LEDGER.md");
const PORTFOLIO_FILE = path.join(__dirname, "..", "data", "portfolio.json");
const DATA_DIR = path.join(__dirname, "..", "data");

function main() {
  const args = process.argv.slice(2);
  const useStdin = args.includes("--stdin");
  const entryIdx = args.indexOf("--entry");

  let entry;
  if (useStdin) {
    entry = fs.readFileSync(0, "utf8");
  } else if (entryIdx !== -1 && args[entryIdx + 1]) {
    const entryPath = path.resolve(args[entryIdx + 1]);
    entry = fs.readFileSync(entryPath, "utf8");
  } else {
    console.error("Usage: node append-ledger.js --entry <file> | --stdin");
    process.exit(1);
  }

  entry = entry.trim();
  if (!entry) {
    console.error("ERROR: empty entry");
    process.exit(1);
  }

  // Read current LEDGER
  let ledger = fs.readFileSync(LEDGER_FILE, "utf8");

  // Extract day number from new entry (e.g. "### Day 122")
  const dayMatch = entry.match(/^### Day (\d+)/m);
  const dayHeader = dayMatch ? `### Day ${dayMatch[1]}` : null;

  // Find insertion point: right after "## Daily Log\n"
  const marker = "## Daily Log";
  const markerIdx = ledger.indexOf(marker);
  if (markerIdx === -1) {
    console.error("ERROR: '## Daily Log' marker not found in LEDGER.md");
    process.exit(1);
  }

  const afterMarker = ledger.indexOf("\n", markerIdx);
  if (afterMarker === -1) {
    console.error("ERROR: unexpected LEDGER format");
    process.exit(1);
  }

  // If same-day entry exists, replace it (keep only latest)
  if (dayHeader) {
    const existingIdx = ledger.indexOf(dayHeader, afterMarker);
    if (existingIdx !== -1) {
      // Find the end of the existing entry (next ### or end of file)
      const nextEntryMatch = ledger.slice(existingIdx + dayHeader.length).match(/\n### Day \d+/);
      const entryEnd = nextEntryMatch
        ? existingIdx + dayHeader.length + nextEntryMatch.index
        : ledger.length;
      // Remove old entry, insert new one in its place
      const beforeOld = ledger.slice(0, existingIdx);
      const afterOld = ledger.slice(entryEnd);
      ledger = beforeOld + entry + "\n\n" + afterOld.replace(/^\n+/, "");
      console.log(`LEDGER.md updated — replaced existing ${dayHeader} entry`);
    } else {
      // No existing entry — insert at top
      const before = ledger.slice(0, afterMarker + 1);
      const after = ledger.slice(afterMarker + 1);
      ledger = before + "\n" + entry + "\n\n" + after;
      console.log("LEDGER.md updated — entry inserted at top of Daily Log");
    }
  } else {
    // Fallback: can't parse day number, insert at top
    const before = ledger.slice(0, afterMarker + 1);
    const after = ledger.slice(afterMarker + 1);
    ledger = before + "\n" + entry + "\n\n" + after;
    console.log("LEDGER.md updated — entry inserted at top of Daily Log (no day header found)");
  }

  // Update Summary table with current portfolio data
  if (fs.existsSync(PORTFOLIO_FILE)) {
    const portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, "utf8"));
    const balance = portfolio.totals.balance_eur.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const pnlPct = portfolio.totals.pnl_pct.toFixed(2);
    const dayFiles = fs.readdirSync(DATA_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    const days = dayFiles.length;

    ledger = ledger.replace(
      /\| Current Balance \| .* \|/,
      `| Current Balance | €${balance} |`
    );
    ledger = ledger.replace(
      /\| Total Return \| .* \|/,
      `| Total Return | ${pnlPct}% |`
    );
    ledger = ledger.replace(
      /\| Days Active \| .* \|/,
      `| Days Active | ${days} |`
    );
  }

  fs.writeFileSync(LEDGER_FILE, ledger);
  console.log("LEDGER.md updated — entry inserted at top of Daily Log");
}

main();
