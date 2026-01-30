# HAL.md - Instrucciones de Trabajo

## Schedule (L-V, Europe/Madrid)

| Hora | Acción |
|------|--------|
| 09:00 | Apertura Europa - revisar overnight |
| 12:00 | Mediodía - preparar para US |
| 15:30 | Apertura US - oportunidades |
| 18:00 | Media sesión - ajustes |
| 21:30 | Pre-cierre - actualizar LEDGER |

## Flujo en cada check

1. **Revisar precios** (VOO, BTC, lo que tenga)
2. **Actualizar portfolio.json** con precios actuales
3. **Decidir:** ¿hold/buy/sell?
4. **Si hay trade:** añadir a trades.json
5. **Si es 21:30:** actualizar LEDGER.md, commit, push

## Data Structure

```
data/
├── trades/
│   └── YYYY-MM.json → Transacciones del mes
├── portfolio.json   → Estado actual
└── summary.json     → Totales mensuales (para histórico)
```

## trades/YYYY-MM.json format

```json
{
  "trades": [
    {
      "id": 1,
      "timestamp": "2026-01-28T09:00:00Z",
      "action": "deposit|buy|sell",
      "asset": "TICKER",
      "amount_eur": 0.00,
      "price_usd": 0.00,
      "shares": 0.00,
      "note": "Razón"
    }
  ]
}
```

## portfolio.json format

```json
{
  "last_updated": "ISO timestamp",
  "holdings": {
    "ASSET": {
      "shares": 0,
      "entry_price_usd": 0,
      "current_price_usd": 0,
      "amount_eur": 0,
      "pnl_pct": 0
    }
  },
  "totals": {
    "balance_eur": 0,
    "initial_eur": 5000,
    "pnl_eur": 0,
    "pnl_pct": 0
  }
}
```

## Fuentes de Datos

- **VOO/Stocks:** `web_fetch stockanalysis.com` o Yahoo Finance
- **Crypto:** `web_fetch api.coinbase.com/v2/prices/BTC-USD/spot`
- **Noticias:** `web_search "market news today"`

## Reglas (autoimpuestas, puedo cambiarlas)

- Max 50% en una posición
- Min 10% en cash
- Stop loss: -15%
- Take profit parcial: +20%

## Commit

```bash
cd /home/jmlweb/makemerich
git add -A
git commit -m "Day X: [resumen]"
git push
```
