# Agent Instructions

> **Para HAL:** Ver [HAL.md](HAL.md) para workflow detallado.

---

## Archivos del Proyecto

| Archivo | Propósito | Actualizar |
|---------|-----------|------------|
| [HAL.md](HAL.md) | **Manual operativo completo** | Cuando cambie el proceso |
| [SIGNALS.md](SIGNALS.md) | **Señales activas y alertas** | Cada sesión |
| [WATCHLIST.md](WATCHLIST.md) | **Assets en vigilancia** | Cuando cambie watchlist |
| [LEDGER.md](LEDGER.md) | Log diario (público) | Diario 21:30 |
| [STRATEGY.md](STRATEGY.md) | Filosofía de inversión | Cuando cambie estrategia |
| [LEARNINGS.md](LEARNINGS.md) | Lecciones aprendidas | Cuando algo notable pase |
| [RULES.md](RULES.md) | Reglas del juego | **Nunca** (fijas) |
| [ASSETS.md](ASSETS.md) | Instrumentos permitidos | Cuando añada opciones |
| [README.md](README.md) | Overview público + chart | Diario |

### Data Files

| Archivo | Propósito | Actualizar |
|---------|-----------|------------|
| `data/portfolio.json` | Estado actual del portfolio | Cada sesión |
| `data/trades/YYYY-MM.json` | Log de transacciones | En cada trade |
| `data/summary.json` | Totales mensuales | Fin de día |
| `data/.prices-latest.json` | Cache de precios | Cada fetch |

---

## Flujo de Trabajo

### Sesiones Clave (L-V)

| Hora | Cron | Acción |
|------|------|--------|
| 09:00 | makemerich-0900 | Apertura Europa - análisis completo |
| 12:00 | makemerich-1200 | Check rápido mediodía |
| 15:30 | makemerich-1530 | Apertura US - oportunidades |
| 18:00 | makemerich-1800 | Check media sesión |
| 21:30 | makemerich-2130 | **Cierre - LEDGER obligatorio** |

### Orden de Operaciones

```
1. Fetch precios       → node scripts/fetch-prices.js
2. Update portfolio    → node scripts/update-portfolio.js
3. Check alertas       → node scripts/check-alerts.js
4. Revisar SIGNALS.md  → ¿Hay señal activa?
5. Decidir             → HOLD / BUY / SELL
6. Si trade            → Registrar en trades.json
7. Si 21:30            → Actualizar LEDGER, commit, push
```

---

## Alertas

Notificar a Jose inmediatamente si:

| Condición | Canal | Urgencia |
|-----------|-------|----------|
| Posición en stop loss (-15%) | Telegram | 🔴 Alta |
| Portfolio -10% desde inicio | Telegram | 🔴 Alta |
| Portfolio +20% desde inicio | Telegram | 🟢 Alta |
| Balance < €1,000 | Telegram | 🔴 Crítica |
| Señal de entrada fuerte | Telegram | 🟡 Media |
| Error en scripts | Telegram | 🟡 Media |

---

## Fuentes de Datos

| Dato | Fuente | Método |
|------|--------|--------|
| ETFs (VOO, QQQ) | Yahoo Finance | `web_fetch stockanalysis.com` |
| Crypto (BTC, ETH) | Coinbase | `web_fetch api.coinbase.com` |
| Fear & Greed | CNN | `web_search "fear greed index"` |
| Noticias | Reuters, CNBC | `web_search "[topic] news"` |
| Indices | Varios | Script fetch-prices.js |

---

## Scripts Disponibles

```bash
# Obtener precios actuales
node scripts/fetch-prices.js

# Actualizar portfolio con precios actuales
node scripts/update-portfolio.js

# Verificar alertas (stop loss, take profit)
node scripts/check-alerts.js

# Sugerir rebalanceo
node scripts/rebalance-suggester.js

# Calcular balance actual
node scripts/calculate-balance.js

# Generar entrada para LEDGER
node scripts/generate-entry.js

# Analizar portfolio
node scripts/analyze-portfolio.js

# Generar dashboard
node scripts/generate-dashboard.js
```

---

## Commit Convention

```bash
git add -A
git commit -m "Day N: [acción principal o HOLD]"
git push
```

Ejemplos:
- `Day 3: HOLD - BTC volatile, waiting`
- `Day 4: BUY QQQ 10% - RSI oversold`
- `Day 5: SELL BTC 25% - Take profit`

---

*Ver [HAL.md](HAL.md) para criterios de decisión detallados.*
