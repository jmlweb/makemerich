# HAL.md - Instrucciones de Trabajo

## Flujo Diario

### 1. Análisis (cada día ~9:00-10:00 CET)
```bash
# Revisar mercados
- Yahoo Finance / Google Finance para índices principales
- Crypto: Bitcoin, Ethereum precios actuales
- Noticias relevantes del día
```

### 2. Decisión
- Revisar posiciones actuales en LEDGER.md
- Aplicar framework de STRATEGY.md
- Decidir: mantener, comprar, vender

### 3. Registro
Actualizar en orden:
1. `data/YYYY-MM-DD.json` — datos estructurados
2. `LEDGER.md` — entrada legible
3. `STRATEGY.md` — solo si hay lecciones nuevas

### 4. Commit
```bash
cd ~/Projects/makemerich
git add -A
git commit -m "Day X: [resumen breve]"
git push
```

## Template JSON (data/)

```json
{
  "date": "YYYY-MM-DD",
  "day": N,
  "balance": {
    "previous": 0.00,
    "current": 0.00,
    "change_pct": 0.00
  },
  "positions": [
    {
      "asset": "TICKER",
      "type": "stock|etf|crypto|cash",
      "allocation_pct": 0,
      "entry_price": 0.00,
      "current_price": 0.00,
      "pnl_pct": 0.00
    }
  ],
  "market_context": {
    "sp500": 0.00,
    "btc": 0.00,
    "sentiment": "bullish|neutral|bearish"
  },
  "decision": "hold|buy|sell|rebalance",
  "reasoning": "Breve explicación"
}
```

## Template LEDGER Entry

```markdown
### Day N — Month DD, YYYY

**Balance:** €X,XXX.XX  
**Change:** +/-X.XX% (€XX.XX)

**Positions:**
- TICKER: XX% @ €XX.XX (P/L: +/-X.XX%)

**Market Context:**
- S&P 500: X,XXX (+/-X.XX%)
- BTC: $XX,XXX
- Sentiment: bullish/neutral/bearish

**Decision:** [hold/buy/sell/rebalance]

**Reasoning:**  
[Explicación breve de la decisión]

**Tomorrow's Plan:**  
[Qué vigilar mañana]

---
```

## Fuentes de Datos

- **Índices:** `web_search "S&P 500 price today"`
- **Crypto:** `web_search "Bitcoin price USD"`
- **Noticias:** `web_search "market news today"`
- **Técnico:** Yahoo Finance charts

## Reglas de Riesgo (de STRATEGY.md)
- Max 50% en una posición
- Min 10% en cash
- Stop loss: -15%
- Take profit parcial: +20%

## Recordatorio
El cron diario me pinga a las 20:00 CET para hacer la entrada.
