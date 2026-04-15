# LivePriceBubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a session-aware live price component backed by a single shared Finnhub WebSocket connection, displayed at the top of the dashboard's price column.

**Architecture:** A `NVDALiveContextProvider` (client component) wraps the app at the root layout, owning one `wss://ws.finnhub.io` connection with exponential-backoff reconnect. `LivePriceBubble` is a presentational component that receives `livePrice`, `prevClose`, `pctChange`, `wsConnected`, and `marketOpen` as props from the Dashboard, and uses pure session-detection utilities from `lib/sessionUtils.js`. The existing `useNVDAData` REST polling hook is unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, Vitest (already configured), Finnhub WebSocket API

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `context/NVDALiveContext.jsx` | WebSocket connection lifecycle, exponential backoff, context value |
| Create | `lib/sessionUtils.js` | Pure ET session detection + countdown calculation (testable) |
| Create | `components/LivePriceBubble.jsx` | Presentational component — 4 render states, flash animation, countdown display |
| Create | `lib/sessionUtils.test.js` | Vitest unit tests for session + countdown logic |
| Modify | `app/layout.jsx` | Wrap `children` in `<NVDALiveContextProvider>` |
| Modify | `app/api/price/route.js` | Add `marketOpen: boolean` from Finnhub market-status (1hr cache) |
| Modify | `app/page.jsx` | Consume `useNVDALive()`, render `<LivePriceBubble>` above `<PricePanel>` |
| Modify | `.env.local` | Add `NEXT_PUBLIC_FINNHUB_API_KEY` |

---

## Task 1: Add client-side env var

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add the env var**

Open `.env.local` and add this line (same key value as `FINNHUB_API_KEY`):

```
NEXT_PUBLIC_FINNHUB_API_KEY=d7f3tlpr01qpjqqjc1cgd7f3tlpr01qpjqqjc1d0
```

`NEXT_PUBLIC_` prefix is required for Next.js to expose the value to browser-side code. The existing server-only `FINNHUB_API_KEY` is untouched.

- [ ] **Step 2: Commit**

```bash
git add .env.local
git commit -m "chore: expose Finnhub key as NEXT_PUBLIC for WebSocket client"
```

---

## Task 2: Add `marketOpen` to `/api/price`

**Files:**
- Modify: `app/api/price/route.js:1-16` (cache declarations at top)
- Modify: `app/api/price/route.js:67-112` (GET handler)

- [ ] **Step 1: Add the market-status cache declaration**

After the existing cache declarations at the top of the file (after line 11 `let dailyCache`), add:

```js
let marketStatusCache = { data: null, ts: 0 }
const MARKET_STATUS_TTL = 3_600_000 // 1 hour
```

- [ ] **Step 2: Add the fetch function**

After the `fetchDaily` function (before `export async function GET`), add:

```js
async function fetchMarketStatus() {
  if (Date.now() - marketStatusCache.ts < MARKET_STATUS_TTL && marketStatusCache.data !== null) {
    return marketStatusCache.data
  }
  try {
    const res  = await fetch(
      `${FINNHUB}/stock/market-status?exchange=US&token=${FH_KEY}`,
      { cache: 'no-store' }
    )
    const json = await res.json()
    const isOpen = json?.isOpen ?? null
    marketStatusCache = { data: isOpen, ts: Date.now() }
    return isOpen
  } catch {
    return null // non-fatal — bubble falls back to client-side ET logic
  }
}
```

- [ ] **Step 3: Call it inside the GET handler and include in response**

In the `GET` function, add `fetchMarketStatus()` to the parallel fetch block. Replace the current `return Response.json({...})` with one that includes `marketOpen`:

The GET handler currently starts `const quotePromise = fetchQuote()`. Change the handler to:

```js
export async function GET() {
  try {
    const quotePromise       = fetchQuote()
    const marketStatusPromise = fetchMarketStatus()

    const sma200 = await fetchSMA(200, sma200Cache, (v) => { sma200Cache = v })
    const sma50  = await fetchSMA(50,  sma50Cache,  (v) => { sma50Cache  = v })
    const daily  = await fetchDaily()
    const quote  = await quotePromise
    const marketOpen = await marketStatusPromise

    const price = quote.c

    const highs = daily?.highs ?? []
    const vols  = daily?.vols  ?? []

    const tenDayHigh      = highs.length >= 10 ? Math.max(...highs.slice(-10))              : null
    const thirtyDayAvgVol = vols.length  >= 30 ? vols.slice(-30).reduce((a, b) => a + b, 0) / 30 : null

    const sparkline = daily
      ? [...daily.closes.slice(-59), price]
      : [price]

    return Response.json({
      price,
      prevClose:      quote.pc,
      pctChange:      quote.dp,
      volume:         quote.v,
      sma200,
      sma50,
      pctFrom200:     sma200 ? ((price - sma200) / sma200) * 100 : null,
      pctFrom50:      sma50  ? ((price - sma50)  / sma50)  * 100 : null,
      tenDayHigh,
      pctBelowHigh:   tenDayHigh ? ((tenDayHigh - price) / tenDayHigh) * 100 : null,
      thirtyDayAvgVol,
      volumeRatio:    thirtyDayAvgVol && quote.v ? quote.v / thirtyDayAvgVol : null,
      sparkline,
      marketOpen,
      lastUpdated:    Date.now(),
    })
  } catch (err) {
    console.error('[/api/price]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verify manually**

```bash
npm run dev
curl http://localhost:3000/api/price | grep -o '"marketOpen":[^,}]*'
```

Expected output: `"marketOpen":true` or `"marketOpen":false` or `"marketOpen":null` (null = fetch failed gracefully).

- [ ] **Step 5: Commit**

```bash
git add app/api/price/route.js
git commit -m "feat: add marketOpen field to /api/price from Finnhub market-status"
```

---

## Task 3: Create `lib/sessionUtils.js` and unit tests

**Files:**
- Create: `lib/sessionUtils.js`
- Create: `lib/sessionUtils.test.js`

- [ ] **Step 1: Write the failing tests first**

Create `lib/sessionUtils.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMarketSession, getCountdown } from './sessionUtils.js'

// Helper: set fake ET time by providing a UTC timestamp that corresponds to
// a known ET wall-clock time. EST = UTC-5, EDT = UTC-4.
// These tests use EDT dates (March–Nov) so offset is -4h = -14400000ms.
function setET(hour, minute, dayOfWeek) {
  // dayOfWeek: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // We pick a fixed Monday in EDT: 2026-04-13 (Mon)
  const baseMonday = new Date('2026-04-13T04:00:00Z') // Mon 00:00 EDT
  const dayOffset  = dayOfWeek === 0 ? -1 : (dayOfWeek - 1) // days from Monday
  const ms = baseMonday.getTime()
    + dayOffset * 86400000
    + (dayOfWeek === 0 ? 7 * 86400000 : 0) // handle Sunday wrapping
    + hour * 3600000
    + minute * 60000
  vi.setSystemTime(ms)
}

describe('getMarketSession', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(()  => vi.useRealTimers())

  it('returns open during regular hours on a weekday', () => {
    setET(10, 0, 1) // Monday 10:00 ET
    expect(getMarketSession()).toBe('open')
  })

  it('returns open at 09:30 exactly', () => {
    setET(9, 30, 1)
    expect(getMarketSession()).toBe('open')
  })

  it('returns open at 15:59', () => {
    setET(15, 59, 1)
    expect(getMarketSession()).toBe('open')
  })

  it('returns premarket 04:00-09:29', () => {
    setET(6, 0, 1)
    expect(getMarketSession()).toBe('premarket')
  })

  it('returns premarket at 04:00 exactly', () => {
    setET(4, 0, 1)
    expect(getMarketSession()).toBe('premarket')
  })

  it('returns afterhours 16:00-19:59', () => {
    setET(18, 0, 1)
    expect(getMarketSession()).toBe('afterhours')
  })

  it('returns afterhours at 16:00 exactly', () => {
    setET(16, 0, 1)
    expect(getMarketSession()).toBe('afterhours')
  })

  it('returns closed after 20:00 on a weekday', () => {
    setET(21, 0, 1)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed before 04:00 on a weekday', () => {
    setET(2, 0, 1)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed on Saturday', () => {
    setET(12, 0, 6)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed on Sunday', () => {
    setET(12, 0, 0)
    expect(getMarketSession()).toBe('closed')
  })
})

describe('getCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(()  => vi.useRealTimers())

  it('counts down to 16:00 during open session', () => {
    setET(14, 0, 1) // 14:00 ET Monday — 2h to close
    const { h, m } = getCountdown('open')
    expect(h).toBe(2)
    expect(m).toBe(0)
  })

  it('counts down to 09:30 during premarket', () => {
    setET(7, 0, 1) // 07:00 ET Monday — 2h 30m to open
    const { h, m } = getCountdown('premarket')
    expect(h).toBe(2)
    expect(m).toBe(30)
  })

  it('counts down to 20:00 during afterhours', () => {
    setET(18, 30, 1) // 18:30 ET Monday — 1h 30m to close
    const { h, m } = getCountdown('afterhours')
    expect(h).toBe(1)
    expect(m).toBe(30)
  })

  it('counts to next-day premarket when closed on weekday night', () => {
    setET(22, 0, 1) // 22:00 ET Monday — 6h to Tuesday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(6)
    expect(m).toBe(0)
  })

  it('skips weekend: counts from Friday night to Monday premarket', () => {
    setET(22, 0, 5) // 22:00 ET Friday — 54h to Monday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(54)
    expect(m).toBe(0)
  })

  it('counts from Sunday to Monday premarket', () => {
    setET(22, 0, 0) // 22:00 ET Sunday — 6h to Monday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(6)
    expect(m).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
npm test
```

Expected: multiple failures — `Cannot find module './sessionUtils.js'`

- [ ] **Step 3: Implement `lib/sessionUtils.js`**

Create `lib/sessionUtils.js`:

```js
export function getETTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

export function getMarketSession() {
  const et  = getETTime()
  const day = et.getDay()
  const t   = et.getHours() * 60 + et.getMinutes()
  if (day === 0 || day === 6)              return 'closed'
  if (t >= 240  && t < 570)               return 'premarket'
  if (t >= 570  && t < 960)               return 'open'
  if (t >= 960  && t < 1200)              return 'afterhours'
  return 'closed'
}

function minutesUntilNextPremarket() {
  const et  = getETTime()
  const day = et.getDay()
  const t   = et.getHours() * 60 + et.getMinutes()
  const rem = 1440 - t // minutes until midnight ET

  if (day === 0) return rem + 240            // Sunday  → Monday 04:00
  if (day === 6) return rem + 1440 + 240     // Saturday → Monday 04:00
  if (t < 240)   return 240 - t             // weekday, before premarket today
  if (day === 5) return rem + 2 * 1440 + 240 // Friday after 20:00 → Monday 04:00
  return rem + 240                           // Mon–Thu after 20:00 → next day 04:00
}

export function getCountdown(session) {
  const et = getETTime()
  const t  = et.getHours() * 60 + et.getMinutes()

  let totalMinutes
  if      (session === 'open')       totalMinutes = 960  - t
  else if (session === 'premarket')  totalMinutes = 570  - t
  else if (session === 'afterhours') totalMinutes = 1200 - t
  else                               totalMinutes = minutesUntilNextPremarket()

  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 }
}
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/sessionUtils.js lib/sessionUtils.test.js
git commit -m "feat: session detection and countdown utilities with Vitest coverage"
```

---

## Task 4: Create `NVDALiveContext`

**Files:**
- Create: `context/NVDALiveContext.jsx`

- [ ] **Step 1: Create the context file**

Create `context/NVDALiveContext.jsx`:

```jsx
'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getMarketSession } from '@/lib/sessionUtils'

const NVDALiveContext = createContext({
  livePrice:   null,
  wsConnected: false,
  lastTick:    null,
})

export function useNVDALive() {
  return useContext(NVDALiveContext)
}

const BACKOFF_MAX    = 30_000
const STALE_TIMEOUT  = 30_000 // market hours only

export function NVDALiveContextProvider({ children }) {
  const [livePrice,   setLivePrice]   = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastTick,    setLastTick]    = useState(null)

  const wsRef          = useRef(null)
  const backoffRef     = useRef(1000)
  const reconnectTimer = useRef(null)
  const staleTimer     = useRef(null)

  function connect() {
    // Don't open a second connection if one is already live
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: 'NVDA' }))
      setWsConnected(true)
      backoffRef.current = 1000 // reset on successful connection
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type !== 'trade' || !Array.isArray(msg.data) || msg.data.length === 0) return
        const price = msg.data[msg.data.length - 1].p
        setLivePrice(price)
        setLastTick(Date.now())

        // Stale-connection guard: only active during regular market hours
        if (getMarketSession() === 'open') {
          clearTimeout(staleTimer.current)
          staleTimer.current = setTimeout(() => setWsConnected(false), STALE_TIMEOUT)
        }
      } catch {
        // malformed message — ignore
      }
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    ws.onclose = () => {
      setWsConnected(false)
      // Reconnect with exponential backoff
      reconnectTimer.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX)
        connect()
      }, backoffRef.current)
    }
  }

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(staleTimer.current)
      if (wsRef.current) {
        // Prevent the onclose handler from scheduling a reconnect on intentional teardown
        wsRef.current.onclose = null
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: 'NVDA' }))
        }
        wsRef.current.close()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NVDALiveContext.Provider value={{ livePrice, wsConnected, lastTick }}>
      {children}
    </NVDALiveContext.Provider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add context/NVDALiveContext.jsx
git commit -m "feat: NVDALiveContext — single Finnhub WebSocket with exponential backoff reconnect"
```

---

## Task 5: Wrap root layout with the provider

**Files:**
- Modify: `app/layout.jsx`

- [ ] **Step 1: Add the provider**

The current layout is a server component. `NVDALiveContextProvider` is a `'use client'` component — Next.js allows server components to render client components directly. Replace the content of `app/layout.jsx`:

```jsx
import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
import SideNav from '@/components/UI/SideNav'
import { NVDALiveContextProvider } from '@/context/NVDALiveContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter-tight' })

export const metadata = {
  title: 'NVDA Jarvis',
  description: 'AI trading co-pilot for NVDA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', display: 'flex' }}>
        <NVDALiveContextProvider>
          <SideNav />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, marginLeft: '90px' }}>
            {children}
          </div>
        </NVDALiveContextProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: app loads, no console errors. Open DevTools → Network → WS tab — you should see a WebSocket connection to `ws.finnhub.io` establish within a few seconds.

- [ ] **Step 3: Commit**

```bash
git add app/layout.jsx
git commit -m "feat: wrap root layout in NVDALiveContextProvider"
```

---

## Task 6: Create `LivePriceBubble` component

**Files:**
- Create: `components/LivePriceBubble.jsx`

- [ ] **Step 1: Create the component**

Create `components/LivePriceBubble.jsx`:

```jsx
'use client'
import { useState, useEffect, useRef } from 'react'
import { getMarketSession, getCountdown } from '@/lib/sessionUtils'

const SESSION_CONFIG = {
  open:       { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', label: 'LIVE'        },
  premarket:  { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: 'PRE-MARKET'  },
  afterhours: { bg: 'rgba(91,156,246,0.12)',  text: '#5b9cf6', label: 'AFTER HOURS' },
  closed:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', label: 'CLOSED'      },
}

const COUNTDOWN_LABEL = {
  open:       'Market closes in',
  premarket:  'Market opens in',
  afterhours: 'Extended hours close in',
  closed:     'Pre-market opens in',
}

export default function LivePriceBubble({ livePrice, prevClose, pctChange, wsConnected, marketOpen }) {
  const [session,   setSession]   = useState(() => getMarketSession())
  const [countdown, setCountdown] = useState(() => getCountdown(getMarketSession()))
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(null)

  // Session + countdown: update every second
  useEffect(() => {
    function tick() {
      const raw      = getMarketSession()
      const effective = (marketOpen === false && raw === 'open') ? 'closed' : raw
      setSession(effective)
      setCountdown(getCountdown(effective))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [marketOpen])

  // Price flash on tick
  useEffect(() => {
    if (livePrice == null) return
    if (prevPriceRef.current == null) {
      prevPriceRef.current = livePrice
      return
    }
    if (livePrice === prevPriceRef.current) return

    const cls = livePrice > prevPriceRef.current ? 'lpb-flash-up' : 'lpb-flash-down'
    setFlashClass(cls)
    prevPriceRef.current = livePrice
    const t = setTimeout(() => setFlashClass(''), 300)
    return () => clearTimeout(t)
  }, [livePrice])

  const cfg = SESSION_CONFIG[session]

  // Displayed price: closed shows prevClose only; other sessions prefer live tick
  const displayPrice = session === 'closed'
    ? prevClose
    : (livePrice ?? prevClose)

  // % change: closed uses REST pctChange; others compute live from prevClose
  const displayPct = session === 'closed'
    ? pctChange
    : (prevClose && displayPrice != null ? (displayPrice - prevClose) / prevClose * 100 : pctChange)

  const isUp = (displayPct ?? 0) >= 0

  const countdownText = countdown
    ? `${countdown.h > 0 ? `${countdown.h}h ` : ''}${countdown.m}m`
    : null

  return (
    <div style={{
      background:   '#0f1117',
      border:       '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px',
      padding:      '14px 18px',
    }}>
      <style>{`
        @keyframes lpbFlashUp   { 0%{color:#34d399} 100%{color:#eef2ff} }
        @keyframes lpbFlashDown { 0%{color:#f87171} 100%{color:#eef2ff} }
        .lpb-flash-up   { animation: lpbFlashUp   300ms ease-out forwards }
        .lpb-flash-down { animation: lpbFlashDown 300ms ease-out forwards }
        @keyframes lpbPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.8)} }
        .lpb-dot { animation: lpbPulse 2s ease-in-out infinite }
      `}</style>

      {/* Row 1: badge · dot · countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          padding: '3px 10px', borderRadius: '20px',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
          fontFamily: 'Inter, sans-serif',
          background: cfg.bg, color: cfg.text,
        }}>
          {cfg.label}
        </span>

        {wsConnected && session !== 'closed' && (
          <div className="lpb-dot" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#34d399', boxShadow: '0 0 6px #34d399',
          }} />
        )}

        {countdownText && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px', color: '#3d4a5c',
            fontFamily: 'Inter, sans-serif',
          }}>
            {COUNTDOWN_LABEL[session]} {countdownText}
          </span>
        )}
      </div>

      {/* Row 2: price */}
      <div
        className={flashClass}
        style={{
          fontFamily:    "'Inter Tight', monospace",
          fontSize:      'clamp(32px, 5vw, 42px)',
          fontWeight:    600,
          letterSpacing: '-1.5px',
          color:         '#eef2ff',
          lineHeight:    1,
          marginBottom:  '8px',
        }}
      >
        {displayPrice != null ? `$${displayPrice.toFixed(2)}` : '—'}
      </div>

      {/* Row 3: % change */}
      {displayPct != null && (
        <span style={{
          fontFamily:  "'Inter Tight', sans-serif",
          fontSize:    '13px',
          fontWeight:  500,
          padding:     '3px 10px',
          borderRadius:'8px',
          color:        isUp ? '#34d399' : '#f87171',
          background:   isUp ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
        }}>
          {isUp ? '▲' : '▼'} {Math.abs(displayPct).toFixed(2)}%
        </span>
      )}

      {/* Premarket note */}
      {session === 'premarket' && (
        <div style={{
          fontSize: '10px', color: '#3d4a5c',
          marginTop: '8px', fontFamily: 'Inter, sans-serif',
        }}>
          Low liquidity — spreads wider than market hours
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/LivePriceBubble.jsx
git commit -m "feat: LivePriceBubble component — 4 session states, flash animation, countdown"
```

---

## Task 7: Wire `LivePriceBubble` into `app/page.jsx`

**Files:**
- Modify: `app/page.jsx`

- [ ] **Step 1: Add imports**

At the top of `app/page.jsx`, after the existing imports, add:

```js
import { useNVDALive }    from '@/context/NVDALiveContext'
import LivePriceBubble    from '@/components/LivePriceBubble'
```

- [ ] **Step 2: Read context inside the Dashboard component**

Inside the `Dashboard` function, after the existing hook calls (`useNVDAData`, `useMacroData`, etc.), add:

```js
const { livePrice, wsConnected } = useNVDALive()
```

- [ ] **Step 3: Render LivePriceBubble above PricePanel**

Find the `price` grid column div:

```jsx
{/* ── PRICE  (col 1, rows 1-2) ─────────────────────────────── */}
<div style={{ gridArea: 'price', display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <PricePanel data={priceData} loading={loading} analystTarget={analystTarget} />
</div>
```

Replace it with:

```jsx
{/* ── PRICE  (col 1, rows 1-2) ─────────────────────────────── */}
<div style={{ gridArea: 'price', display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <LivePriceBubble
    livePrice={livePrice}
    prevClose={priceData?.prevClose ?? null}
    pctChange={priceData?.pctChange ?? null}
    wsConnected={wsConnected}
    marketOpen={priceData?.marketOpen ?? null}
  />
  <PricePanel data={priceData} loading={loading} analystTarget={analystTarget} />
</div>
```

- [ ] **Step 4: Manual browser verification checklist**

```bash
npm run dev
```

Open `http://localhost:3000`. Check each item:

**Layout**
- [ ] LivePriceBubble appears above PricePanel in column 1 on desktop
- [ ] On mobile (DevTools → 390px), LivePriceBubble is the first element, full-width

**Session badge** (adjust based on current ET time)
- [ ] Between 09:30–16:00 ET weekday: green `LIVE` badge
- [ ] Between 04:00–09:30 ET weekday: orange `PRE-MARKET` badge + note text
- [ ] Between 16:00–20:00 ET weekday: blue `AFTER HOURS` badge
- [ ] Outside those hours / weekend: grey `CLOSED` badge

**WebSocket**
- [ ] DevTools → Network → WS: one connection to `ws.finnhub.io`, status 101
- [ ] During market hours: `livePrice` in the bubble updates without page refresh
- [ ] Pulsing green dot visible when `wsConnected` is true

**Countdown**
- [ ] Text format is `Xh Xm` or `Xm` — never `X:XX:XX`
- [ ] Value is correct for current ET session

**Price flash**
- [ ] During market hours: brief green/red flash on price number when a new tick arrives (may need to wait a minute)

- [ ] **Step 5: Commit**

```bash
git add app/page.jsx
git commit -m "feat: wire LivePriceBubble into dashboard — reads NVDALiveContext, positioned above PricePanel"
```

---

## Self-Review Checklist (completed inline)

**Spec coverage:**
- ✅ Task 1: `NEXT_PUBLIC_FINNHUB_API_KEY` env var
- ✅ Task 2: `marketOpen` from `/api/price`
- ✅ Task 3: `NVDALiveContext` — WebSocket lifecycle, exponential backoff, unsubscribe on unmount
- ✅ Task 4: `app/layout.jsx` wrapped in provider
- ✅ Task 5: `sessionUtils.js` — `getMarketSession` and `getCountdown` with Vitest tests for all boundary cases
- ✅ Task 6: All four states (open/premarket/afterhours/closed), pulsing dot rule (`wsConnected && session !== 'closed'`), flash animation, countdown, premarket note
- ✅ Task 7: Wired into page.jsx above PricePanel, manual verification checklist

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `getMarketSession()` returns `'open' | 'premarket' | 'afterhours' | 'closed'` — used consistently in all tasks
- `getCountdown(session)` returns `{ h: number, m: number }` — consumed correctly in Task 6
- `useNVDALive()` returns `{ livePrice, wsConnected, lastTick }` — consumed in Task 7 (only `livePrice` and `wsConnected` are used, `lastTick` is available for future use)
- `SESSION_CONFIG` keys match the four values returned by `getMarketSession()` exactly
