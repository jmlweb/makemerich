---
name: add-instrument
description: Add a new tradable instrument to the quant universe, or rename/rotate an existing one (VOO→SXR8, GLD→SGLD→4GLD pattern). Covers legality vetting, script wiring, risk classification, docs, and the ticker-alias map. Use when Jose says "add X to the watchlist", "can we trade X", or an instrument changes ticker/listing.
---

# Add / Rename Instrument

Instrument changes touch ~8 places; missing one caused real incidents (NATO added outside `apply-trades.js` → 8 days of broken P&L; SGLD chosen without a currency check → months of FX drag). Follow all steps in order.

## Mode A — Add a new instrument

### 1. Vet before wiring (hard gates, from LEARNINGS 2026-02-06 / 2026-03-27)

- [ ] **Legal in Spain**: UCITS ETF/ETC with KID, or crypto on a regulated exchange. US-domiciled ETFs (no KID) are NOT tradable — find the UCITS equivalent (VOO→SXR8, QQQ→EQQQ).
- [ ] **Currency**: portfolio is EUR-based → prefer EUR-denominated listing. USD denomination = FX drag; justify or reject.
- [ ] **TER**: record it; if a cheaper equivalent tracker exists, use that one.
- [ ] **Tracking methodology**: physical vs synthetic, NAV lag (the SGLD LBMA-auction lag lesson).
- [ ] **Risk class**: decide now — high-risk? inverse/leveraged? defensive? This drives position limits.
- [ ] Get ISIN + the exact Yahoo Finance/stockanalysis symbol for the chosen listing (Xetra symbols often differ, e.g. `SXR8.DE`).

If any gate fails, report why and propose the compliant alternative. Stop.

### 2. Wire the scripts

Grep first — asset lists are constants near the top of each file:

```bash
rg -n "SXR8" scripts/*.js | rg -v node_modules
```

- [ ] `scripts/fetch-prices.js` — add symbol → source mapping (Yahoo/stockanalysis for ETFs, Coinbase for crypto), correct currency field.
- [ ] `scripts/fetch-history.js` — add to the history universe so 1y OHLCV caches to `data/history/{SYMBOL}.json`.
- [ ] `scripts/generate-quant-signals.js` — add to the signal universe.
- [ ] `scripts/execute-signals.js` — classify in `isHighRisk` / `isInverse` / `isDefensive` and set the fee rate (`getFeeRate`: 0.1% ETF, 0.5% crypto — RULES.md §5). Misclassification here silently breaks the 30%/15% limit enforcement.
- [ ] `scripts/generate-signals.js` / `scripts/validate-rules.js` — check whether they hold their own asset-class lists; sync if so.

### 3. Docs

- [ ] `ASSETS.md` — table row: ticker, ISIN, description, TER, currency, in the right section.
- [ ] `SIGNALS.md` — Watchlist table row ("currently in quant signal pipeline").
- [ ] AGENTS.md Data Sources table — only if a new data source/method was introduced.

### 4. Verify

```bash
node scripts/fetch-prices.js        # new symbol returns a price, right currency
node scripts/fetch-history.js      # data/history/{SYMBOL}.json created, ~250 rows
node scripts/generate-quant-signals.js   # symbol appears with indicators, no NaN
node scripts/execute-signals.js    # runs clean; no unexpected orders
node scripts/validate-data.js      # still passes
node scripts/backtest.js --symbol {SYMBOL}   # sanity: signals behave on history
```

- [ ] Commit: `feat: add {SYMBOL} ({name}) to quant universe` — scripts + docs in one commit.

**Never** seed a position by editing `portfolio.json`. Entry happens only when the quant system emits an order and `apply-trades.js` records it.

## Mode B — Rename / rotate an existing holding

Two different operations — pick correctly:

**Rename** (same exposure, new ticker/listing — e.g. broker migrates GLD→SGLD):
1. Old trades stay under the old ticker — never rewrite trade history.
2. `data/.ticker-aliases.json`: add old→new in `resolve`, append `history` entry with date + reason.
3. Update ticker in `portfolio.json` holding key ONLY via the alias-aware path; run `validate-data.js` — check 5 (trades↔holdings) must still reconcile through the alias map.
4. Wire the new symbol per Mode A step 2; keep or remove the old symbol from fetch universes depending on whether history is still needed.
5. Update ASSETS.md, SIGNALS.md.

**Rotation** (different instrument, better vehicle — e.g. SGLD→4GLD):
1. This is a real SELL + BUY: must flow through `execute-signals.js` orders or an explicit Jose-approved manual order, recorded by `apply-trades.js` with fees.
2. Then Mode A for the new instrument, and mark the old one Historical in SIGNALS.md.
3. LEARNINGS.md entry if the rotation encodes a lesson (instrument-quality rotations usually do).

## Escalation

- Instrument legal but exotic (P2P, prediction markets, fractional art): supported by RULES.md §3 but has no script support — propose the data-source plan to Jose before writing code.
- Can't find a reliable free price source → stop; an asset the pipeline can't price daily cannot enter the universe.
