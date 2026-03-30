# 📚 Learnings

Mistakes, successes, and patterns. Updated when something notable happens.

---

## 2026-02-06: Cumplimiento Legal España

**Category:** Strategy / Compliance  
**Impact:** Reestructuración completa del portfolio

**What happened:** Jose solicitó invertir "de la manera más inteligente y legal en España." Descubrí que los ETFs US (VOO, GLD, QQQ) técnicamente no son accesibles para inversores minoristas en España/UE debido a regulación PRIIPS/MiFID II (falta de documentación KID).

**Lesson:** Verificar siempre la legalidad de los instrumentos antes de usar. Lo que funciona en US no siempre es accesible en España.

**Action:** 
1. Convertido a ETFs UCITS domiciliados en Irlanda (SXR8, VWCE, SGLD)
2. Añadida exposición crypto (BTC, ETH) - legal y regulado en España
3. Actualizado scripts para manejar activos EUR y USD
4. Documentado en ASSETS.md las opciones legales

**Ventajas del cambio:**
- 100% legal y conforme
- Mejor retención fiscal (15% vs 30% en dividendos US)
- ETFs acumulativos = diferimiento fiscal hasta venta
- Exposición crypto para potencial 10x

---

## 2026-01-30: System Design Matters

**Category:** Operations  
**Impact:** Process improvement

**What happened:** Initial HAL.md was just a schedule with no decision criteria. Cron payloads were too vague ("check markets"). No clear framework for when to buy/sell.

**Lesson:** Autonomous operation requires explicit decision trees, not just schedules. Vague instructions lead to inconsistent behavior.

**Action:** Created comprehensive HAL.md with entry/exit criteria, SIGNALS.md for active alerts, WATCHLIST.md for tracked assets. Crons now have step-by-step instructions.

---

## 2026-01-30: Separate Tracking Files

**Category:** Operations  
**Impact:** Better organization

**What happened:** Trying to track signals, watchlist, and daily logs in the same mental space was messy.

**Lesson:** Separate concerns: SIGNALS.md for what's actionable NOW, WATCHLIST.md for what to monitor, LEDGER.md for history.

**Action:** Created dedicated files for each purpose.

---

## 2026-01-30: BTC Volatility

**Category:** Strategy  
**Impact:** -€34.41 (-4.59% on position)

**What happened:** BTC dropped from $86,500 to $82,536 in 3 days while VOO only moved -0.59%.

**Lesson:** Crypto is significantly more volatile than broad market ETFs. A 15% allocation can swing the portfolio more than expected.

**Action:** Consider smaller crypto positions (5-10%) or use BTC for tactical trades only, not long-term hold.

---

## 2026-01-28: Initial Allocation

**Category:** Strategy  
**Impact:** Neutral (baseline)

**What happened:** Started with conservative 60% cash, 25% VOO, 15% BTC.

**Lesson:** High cash reserve (60%) limits upside but provides safety and flexibility to buy dips.

**Action:** Monitor for opportunities to deploy cash if market drops 5%+.

---

## Patterns

| Pattern | Notes |
|---------|-------|
| BTC weekend drops | Liquidity lower, more volatile |
| BTC drags portfolio | 15% allocation caused most of the -0.84% loss |
| High cash = patience | 60% cash means we can wait for real opportunities |
| Explicit > implicit | Write down criteria or they won't be followed |

---

## Mistakes

| Date | Mistake | Cost | Lesson |
|------|---------|------|--------|
| - | - | - | None yet |

---

## Wins

| Date | Win | Gain | Why |
|------|-----|------|-----|
| 2026-01-30 | System overhaul | N/A | Clear framework for autonomous operation |
| 2026-01-28 | Conservative start | Safety | 60% cash preserved capital during BTC drop |

---

*See [STRATEGY.md](STRATEGY.md) for current approach.*

---

## 2026-03-27: SGLD vs 4GLD — Instrument Quality Matters

**Category:** Strategy / Instrument Selection  
**Impact:** Reduced FX drag, 0% TER vs 0.12%, better NAV tracking

**What happened:** SGLD (Invesco Physical Gold ETC) showed -9.56% return while spot gold was actually near all-time highs. Investigation revealed three compounding problems: (1) SGLD priced in USD → EUR/USD movements hurt a EUR-based portfolio; (2) LBMA PM auction daily lag means intraday spot moves aren't reflected immediately in SGLD price; (3) 0.12% annual TER slowly erodes returns.

**Lesson:** For EUR-based gold exposure, 4GLD (Xetra-Gold, DE000A0S9GB0) is strictly superior: TER 0%, EUR-denominated, 1g physical gold per unit, trades on Deutsche Börse Xetra. Use 4GLD for gold, not SGLD.

**Action:** Rotated full position SGLD → 4GLD. Also deployed remaining cash into 4GLD given strong gold macro outlook (tariffs, USD weakness, analyst targets $5,000-6,000 Q4 2026).

**Rule added:** When selecting ETFs/ETCs: always check (1) currency denomination vs portfolio currency, (2) TER, (3) tracking methodology. EUR-based portfolio = prefer EUR-denominated instruments.


---

## 2026-03-30: Error contable — XEON precio de entrada incorrecto

**Category:** Operations / Accounting  
**Impact:** Balance inflado €1,206 (+29% ficticio)

**What happened:** Al añadir XEON al ASSET_INFO del script, se usó el precio de mercado actual (€148.40) como precio de entrada en lugar del precio real de compra (€140.50). Esto generó menos unidades de las reales y cuando el script valoró la posición multiplicó un precio actual más alto × unidades incorrectas, inflando el valor de XEON de €477 real a €1,682.

Adicionalmente, el script no estaba rebajando el valor de XEON cuando se usó para financiar otras posiciones (DXS3, NATO) — esos movimientos se hacían en Python directamente en portfolio.json pero el script de Node los sobreescribía al ejecutar update-portfolio.js.

**Root cause:** Dos fuentes de verdad (Python scripts vs Node script) sin sincronización. El Node script recalcula desde unidades × precio, ignorando los movimientos de caja manuales.

**Lesson:** 
1. **Siempre usar el precio de compra real** como `entry_price_eur` — nunca el precio de mercado en el momento de añadir al script
2. **Una sola fuente de verdad**: o el script calcula todo desde trades, o portfolio.json es la fuente y el script solo actualiza precios — no ambas cosas
3. **Verificar balance antes y después** de cualquier cambio en scripts contables: si el balance salta >5% sin un trade ejecutado, hay un bug

**Rule added:** Antes de hacer commit de cualquier cambio en scripts de valoración, verificar que el balance resultante = balance anterior ± trades ejecutados ± variación de precio razonable. Si no cuadra → investigar antes de commitear.

---

## 2026-03-30: Auditoría completa — lecciones de contabilidad y operaciones

**Category:** Operations / Accounting / Strategy  
**Impact:** Balance incorrecto durante días, decisiones tomadas sobre datos falsos

---

### Lección 1: Verificar el total del portfolio después de cada trade

**What happened:** El Day 43, tras ejecutar la rotación SGLD→4GLD y los stops de SXR8/VWCE, el LEDGER registró el balance excluyendo 4GLD. El error pasó desapercibido durante días porque no había un check automático de "suma de posiciones = total reportado".

**Rule:** Después de cada trade, calcular `sum(holdings.values())` y comparar con el balance reportado. Si difieren en >€1, hay un error.

---

### Lección 2: Nunca usar el precio de mercado actual como precio de entrada

**What happened:** Al añadir XEON al script de valoración, se usó el precio de mercado del día (€148.40) como `entry_price_eur` en lugar del precio real de compra (€140.50). Esto infló el P&L calculado y confundió el análisis.

**Rule:** `entry_price` = precio al que se ejecutó la orden. Siempre. El script de valoración debe respetar ese precio y calcular P&L como `(current - entry) / entry`.

---

### Lección 3: Dos fuentes de verdad = garantía de error

**What happened:** Los trades se registraban en Python (portfolio.json) pero el script de Node (update-portfolio.js) recalculaba los valores desde `units × current_price`, sobreescribiendo los ajustes manuales. Esto creó una desincronización permanente.

**Rule:** Una sola fuente de verdad. El script de valoración solo debe actualizar `current_price_eur` y recalcular `amount_eur = units × current_price`. El `entry_price` y las `units` son inmutables desde el momento del trade.

---

### Lección 4: El timing de los stops importa — no solo el nivel

**What happened:** El stop de SXR8 se ejecutó al -16.7% (superando el -15% definido) porque el mercado abrió directamente por debajo del nivel. Con un stop market en vez de limit, se habría ejecutado exactamente en el -15%.

**Lesson:** En bear markets con alta volatilidad, los gaps de apertura pueden superar el stop. Considerar reducir el tamaño de posición cuando la volatilidad es alta, no solo ajustar el nivel de stop.

---

### Lección 5: NATO comprado en máximo local — sizing demasiado agresivo

**What happened:** NATO se compró el 29 de marzo a €18.50 y cayó a €16.20 (-12.4%) casi inmediatamente. La tesis es correcta (rearme europeo) pero el timing fue malo — el ETF ya había subido +50% en 2025 y estaba en sobrecompra.

**Lesson:** Para activos con momentum fuerte ya descontado, entrar con sizing reducido (€200 en vez de €400) y escalar si confirma soporte. No perseguir movimientos ya realizados.

---

### Lección 6: El cash inactivo tiene coste real

**What happened:** €2,266 en cash durante días mientras el mercado se movía. La decisión de moverlo a XEON fue correcta pero tardó demasiado.

**Rule:** Cualquier posición en cash >15% del portfolio durante >48h debe moverse a XEON. El coste de oportunidad a 3.5% APY es pequeño, pero es dinero gratis que no se debe dejar sobre la mesa.

---

### Patrón identificado: Los mejores trades fueron los más rápidos

| Trade | Velocidad | Resultado |
|-------|-----------|-----------|
| SGLD → 4GLD | Rápido (tesis clara) | Correcto, ahorra FX drag |
| Stops SXR8/VWCE | Automático | Evitó -30% adicional |
| XEON deploy | Tardó 2 días | Correcto pero tardío |
| DXS3 pre-Liberation Day | Inmediato | Por verificar |
| NATO | Inmediato | Timing malo, sizing excesivo |

**Lesson:** La velocidad es buena cuando la tesis está clara y el instrumento es el correcto. La velocidad sin análisis (NATO en sobrecompra) genera pérdidas. El criterio no es "actuar rápido" sino "actuar cuando hay convicción + instrumento correcto + timing razonable".

