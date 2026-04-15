# LivePriceBubble — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

---

## Overview

A new dashboard component that shows the live NVDA price with full session awareness. It is the first thing visible when the app opens — positioned at the top of column 1 in the existing 3-column desktop grid, stacked above PricePanel. On mobile (single column) it is the dominant full-width element above everything else.

The component is backed by a real Finnhub WebSocket connection (`wss://ws.finnhub.io`) that delivers tick-by-tick price updates during market hours. The WebSocket is managed by a shared React context so only one connection ever exists per session.

---

## Layout

**Desktop (≥641px):** LivePriceBubble renders inside the `price` grid column (column 1), as the first child, stacked above the existing PricePanel cards. It is constrained to the column width — no full-width banner. PricePanel is not changed.

**Mobile (≤640px):** LivePriceBubble is the first element in the single-column layout, full-width. It is the dominant visual above PricePanel, Thesis, and all other panels.

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `context/NVDALiveContext.jsx` | WebSocket connection owner + context provider |
| `components/LivePriceBubble.jsx` | Presentational component, session-aware |

### Modified files

| File | Change |
|------|--------|
| `app/layout.jsx` | Wrap `children` in `<NVDALiveContextProvider>` |
| `app/api/price/route.js` | Add `marketOpen: boolean` field from Finnhub market-status endpoint (1hr cache) |
| `app/page.jsx` | Read `livePrice` + `wsConnected` from context; render `<LivePriceBubble>` above `<PricePanel>` |

### No changes

- `hooks/useNVDAData.js` — continues to poll REST for SMA, volume, sparkline, prevClose, marketOpen unchanged
- `components/Dashboard/PricePanel.jsx` — unchanged

---

## NVDALiveContext (`context/NVDALiveContext.jsx`)

### Responsibility
Owns exactly one Finnhub WebSocket connection for the life of the browser session. Provides live price data to any component in the tree.

### Connection lifecycle
1. On mount: connect to `wss://ws.finnhub.io?token=[FINNHUB_API_KEY]`
2. On open: send `{"type":"subscribe","symbol":"NVDA"}`
3. On message type `"trade"`: extract latest trade price from `data[data.length - 1].p`, update `livePrice` and `lastTick`
4. On close/error: reconnect with exponential backoff (1s → 2s → 4s → 8s → … → 30s cap)
5. On unmount: send `{"type":"unsubscribe","symbol":"NVDA"}`, close connection, clear timers

### Context value
```js
{
  livePrice:   number | null,   // latest trade price from WebSocket
  wsConnected: boolean,         // true when socket is OPEN and receiving
  lastTick:    number | null,   // Date.now() of last trade message
}
```

### Notes
- `prevClose` is **not** sourced from the WebSocket. It comes from the REST quote (`useNVDAData` → `priceData.prevClose`) and is passed as a prop to LivePriceBubble by the Dashboard.
- The Finnhub key is read from `process.env.NEXT_PUBLIC_FINNHUB_API_KEY`. A new env var `NEXT_PUBLIC_FINNHUB_API_KEY` is needed (the existing `FINNHUB_API_KEY` is server-only; the WebSocket runs client-side).
- `wsConnected` is set to `false` after 30s with no incoming trade message **during market hours only** (stale connection guard — extended hours and closed periods naturally have fewer/no trades).

---

## `/api/price` route change

Add one in-memory cache entry:

```js
let marketStatusCache = { data: null, ts: 0 }
const MARKET_STATUS_TTL = 3600_000 // 1 hour
```

Fetch `GET https://finnhub.io/api/v1/stock/market-status?exchange=US&token=${FH_KEY}` on cache miss. Extract `isOpen: boolean` from the response. Add to the returned JSON:

```js
marketOpen: isOpen  // boolean
```

Failure behaviour: if the status fetch fails, omit `marketOpen` from the response (do not throw). The LivePriceBubble falls back to client-side ET time logic.

---

## LivePriceBubble (`components/LivePriceBubble.jsx`)

### Props
```js
{
  livePrice:   number | null,   // from NVDALiveContext via Dashboard
  prevClose:   number | null,   // from priceData.prevClose (REST)
  pctChange:   number | null,   // from priceData.pctChange (REST) — used in closed state
  wsConnected: boolean,         // from NVDALiveContext via Dashboard
  marketOpen:  boolean | null,  // from priceData.marketOpen (REST), null = unknown
}
```

### Session detection

```js
function getETTime() {
  const now = new Date()
  const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  return new Date(etString)
}

function getMarketSession() {
  const et = getETTime()
  const day = et.getDay()
  const timeInMinutes = et.getHours() * 60 + et.getMinutes()
  if (day === 0 || day === 6) return 'closed'
  if (timeInMinutes >= 240  && timeInMinutes < 570)  return 'premarket'
  if (timeInMinutes >= 570  && timeInMinutes < 960)  return 'open'
  if (timeInMinutes >= 960  && timeInMinutes < 1200) return 'afterhours'
  return 'closed'
}
```

If `marketOpen === false` and client-side session resolves to `'open'`, override session to `'closed'` (holiday).

### Countdown timer
`setInterval(1000)` runs continuously. Each tick recalculates session and time remaining to the next session boundary. Displays as `Xh Xm` (never `X:XX:XX`). Timer clears on unmount.

### Price flash animation
On each render, compare incoming `livePrice` to the value held in `useRef`. If changed: apply CSS class `price-flash-up` (green) or `price-flash-down` (red) for 300ms via `setTimeout`, then remove. Uses `className` toggling — no inline style mutation.

CSS:
```css
@keyframes flashUp   { 0%{color:#34d399} 100%{color:#eef2ff} }
@keyframes flashDown { 0%{color:#f87171} 100%{color:#eef2ff} }
.price-flash-up   { animation: flashUp   300ms ease-out forwards }
.price-flash-down { animation: flashDown 300ms ease-out forwards }
```

### Four render states

**Pulsing dot rule (all states):** Show the pulsing green dot whenever `wsConnected === true`, regardless of session. If the WebSocket is connected and receiving in premarket or afterhours, the dot appears. It is hidden only when `wsConnected === false` (disconnected, reconnecting, or `closed` state where the dot is never shown).

**`open`**
- Green pill badge: `LIVE`
- Pulsing green dot when `wsConnected === true`
- Large monospace price: `livePrice ?? prevClose`
- `% change` from `prevClose` — green if positive, red if negative
- Countdown: `Market closes in Xh Xm`

**`premarket`**
- Orange pill badge: `PRE-MARKET`
- Pulsing green dot when `wsConnected === true`
- Price: `livePrice ?? prevClose` (WebSocket will stream any pre-market trades)
- `% change` from `prevClose`
- Countdown: `Market opens in Xh Xm`
- Small note: `Low liquidity — spreads wider than market hours`

**`afterhours`**
- Blue pill badge: `AFTER HOURS`
- Pulsing green dot when `wsConnected === true`
- Price: `livePrice ?? prevClose`
- `% change` from `prevClose`
- Countdown: `Extended hours close in Xh Xm`

**`closed`**
- Grey pill badge: `CLOSED`
- No pulsing dot (never — WebSocket does not stream outside 04:00–20:00 ET)
- Price: `prevClose` (last known close — do not show stale WebSocket tick)
- `% change`: show `pctChange` from REST (last session's change vs previous day close)
- Countdown: `Pre-market opens in Xh Xm` (counting to 04:00 ET next trading day — skips weekends)

### Style
```
Background:       #0f1117
Border:           1px solid rgba(255,255,255,0.065)
Border-radius:    14px
Padding:          14px 18px
Price font:       'Inter Tight', monospace, 36px, weight 600 (desktop) / 42px (mobile)
Badge shape:      pill (border-radius: 20px), padding: 3px 10px
```

Colour map:
| State | Badge bg | Badge text |
|-------|----------|------------|
| open | `rgba(52,211,153,0.12)` | `#34d399` |
| premarket | `rgba(251,191,36,0.12)` | `#fbbf24` |
| afterhours | `rgba(91,156,246,0.12)` | `#5b9cf6` |
| closed | `rgba(100,116,139,0.12)` | `#94a3b8` |

---

## Dashboard wiring (`app/page.jsx`)

```jsx
import { useNVDALive } from '@/context/NVDALiveContext'
import LivePriceBubble from '@/components/LivePriceBubble'

// Inside Dashboard component:
const { livePrice, wsConnected } = useNVDALive()

// In the price grid column div, before <PricePanel>:
<LivePriceBubble
  livePrice={livePrice}
  prevClose={priceData?.prevClose ?? null}
  pctChange={priceData?.pctChange ?? null}
  wsConnected={wsConnected}
  marketOpen={priceData?.marketOpen ?? null}
/>
```

---

## Environment variable

A new env var is required client-side:

```
NEXT_PUBLIC_FINNHUB_API_KEY=<your_finnhub_api_key>
```

Add to `.env.local`. The existing server-side `FINNHUB_API_KEY` is unchanged and continues to be used by all API routes.

---

## Out of scope

- No changes to PricePanel
- No changes to useNVDAData
- No other dashboard components touched
- No after-hours extended price from a separate source — Finnhub WebSocket streams whatever trades occur in extended hours; if there are none, fall back to `prevClose`
