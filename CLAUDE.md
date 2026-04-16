# NVDA Jarvis — Trading Assistant

## How To Use This Project

This codebase is maintained by one non-technical owner with Claude Code as
the builder. Every session should:

1. Read DESIGN.md completely before writing any UI-related code
2. Read this file completely before writing any code
3. Make only the changes explicitly requested
4. Not create new files without stating the intention first
5. Not modify files not mentioned in the prompt
6. End every session by listing exactly what was created and what was changed

When in doubt, do less and report back rather than assuming.

---

## Project Overview

A Jarvis-style AI trading assistant for NVDA. Hosted on Vercel via Next.js 15.
Mobile-first, dark mode, voice-enabled (voice deferred — see Phase 3).
The owner trades NVDA exclusively and needs a real-time right-hand man
watching everything so he can be the final decision maker only.

---

## Core Philosophy

Every feature answers one of three questions only:
1. Is NVDA worth more than it's currently priced?
2. Why is it trading below fair value right now?
3. What will resolve that gap?

Reduce every output to yes/no or a clear recommended action.
No walls of text. No raw data dumps. Everything interpreted.

---

## Owner Trading Context

- Trades NVDA only, up to 5,000 shares max
- Two trade types — label before entry, never switch mid-trade:
  - CONVICTION: days to weeks, thesis-based, hold through noise
  - SCALP: max 48hr hold, tight entry/exit, exit regardless if no hit in 48hrs
- Base currency: EUR
- Earnings: May 20, 2026 (EPS est. $1.76, revenue $78.42B) — use EARNINGS_DATE from lib/config.js
- FOMC: April 28-29, 2026 — use FOMC_DATE from lib/config.js

---

## Exact Cost Structure (use in all P&L calculations)

```
gross_pnl            = (exit_price - entry_price) * shares
transaction_fees     = (entry_price * shares * 0.001) + (exit_price * shares * 0.001)
interest_cost        = entry_price * shares * 0.000212 * days_held
after_fees           = gross_pnl - transaction_fees - interest_cost
after_split          = after_fees * 0.50
after_tax            = after_split * 0.90
net_eur              = after_tax * 0.90
```

Interest: 7.74% annual = 0.0212%/day
Transaction fee: 0.1% each side
Commission split: 50%
Tax: 10%
FX: USD to EUR fixed at 0.90 (no live rate needed)

For closed trade history (Track page), the formula also includes:
- Platform fee: $96 per execution day (buy day + sell day only, not days in between)
- Same-day trade = 1 day = $96. Different days = always 2 days = $192.
- See lib/tradeCalculations.js for the full implementation.

---

## Tech Stack

- Framework: Next.js 15 (App Router)
- Frontend: React + Tailwind CSS
- Backend: Next.js API routes as Vercel Serverless Functions
- Voice input: Web Speech API (browser native) — Phase 3, deferred
- Voice output: ElevenLabs TTS — Phase 3, deferred
- AI layer: Anthropic API (claude-sonnet-4-6)
- Price/macro data: Finnhub (quotes + QQQ), Twelve Data (SMAs + time series), OilPriceAPI (Brent crude), Yahoo Finance (VIX)
- Fundamentals: Alpha Vantage API (OVERVIEW endpoint)
- Persistence: Upstash Redis (KV)
- Hosting: Vercel (auto-deploy from GitHub main branch)

---

## Environment Variables

All secrets live in .env.local (gitignored) and in Vercel dashboard.
Never hardcode values — always use process.env.

```
FINNHUB_API_KEY                   server-side only (API routes)
NEXT_PUBLIC_FINNHUB_API_KEY       client-side (WebSocket in NVDALiveContext)
ALPHA_VANTAGE_API_KEY             server-side only (fundamentals/route.js OVERVIEW endpoint)
TWELVE_DATA_API_KEY               server-side only (SMAs + daily time series in price/route.js)
OIL_PRICE_API_KEY                 server-side only (Brent crude in macro/route.js)
ANTHROPIC_API_KEY                 server-side only
ELEVENLABS_API_KEY                server-side only (Phase 3, not yet used)
ELEVENLABS_VOICE_ID               server-side only (Phase 3, not yet used)
UPSTASH_REDIS_REST_URL            server-side only
UPSTASH_REDIS_REST_TOKEN          server-side only
```

---

## Project Structure

```
nvda-jarvis/
├── CLAUDE.md
├── DESIGN.md                          visual design system — read before any UI work
├── .env.local                         (gitignored — see Vercel dashboard for values)
├── package.json
├── next.config.mjs
├── tailwind.config.js
│
├── context/
│   └── NVDALiveContext.jsx            single Finnhub WebSocket for the session
│
├── app/
│   ├── layout.jsx                     root layout: mounts AlertBanner + SideNav
│   ├── globals.css                    global styles + lpb animation keyframes
│   ├── page.jsx                       Dashboard (home)
│   ├── read/page.jsx                  Give Me A Read (AI analysis + history tabs)
│   ├── trade/page.jsx                 Pre-Trade Checklist
│   ├── alerts/page.jsx                Alert config
│   ├── track/page.jsx                 Trade history + P&L summary
│   │
│   └── api/
│       ├── price/route.js             NVDA quote (Finnhub), SMAs + time series (Twelve Data), market status
│       ├── macro/route.js             QQQ (Finnhub), Brent oil (OilPriceAPI), VIX (Yahoo Finance)
│       ├── news/route.js              NVDA news (Finnhub), keyword-classified A/B/C
│       ├── fundamentals/route.js      Analyst target, PE, EPS (AV, 6hr KV cache)
│       ├── analysis/route.js          Give Me A Read (Anthropic, 30min KV cache)
│       ├── checklist/route.js         Pre-trade eval (Anthropic, on demand)
│       ├── positions/route.js         Open positions + cash + Iran status (KV CRUD)
│       ├── alerts/route.js            Alert config + custom price levels (KV CRUD)
│       └── trades/route.js            Closed trade history (KV CRUD, full P&L stored)
│
├── components/
│   ├── LivePriceBubble.jsx            Live price, session badge, countdown, flash
│   ├── Dashboard/
│   │   ├── PricePanel.jsx             Price, SMAs, volume ratio, 10d high, sparkline
│   │   ├── ThesisStatus.jsx           INTACT / AT RISK / BROKEN orb + trigger list
│   │   ├── MacroPanel.jsx             Oil, QQQ, VIX tiles
│   │   ├── PositionPanel.jsx          Open positions + cash + live P&L
│   │   ├── CatalystBar.jsx            Iran toggle, earnings + FOMC countdowns
│   │   ├── BuyChecklist.jsx           6-condition entry checklist
│   │   ├── SignalGauge.jsx            Pass/fail gauge (X of 6 conditions)
│   │   ├── NewsPanel.jsx              Bucketed news feed with A/B/C labels
│   │   └── Sparkline.jsx              SVG mini price chart inside PricePanel
│   ├── Track/
│   │   ├── SummaryCards.jsx           8 stat cards (trades, net profit, win rate, etc.)
│   │   ├── TradeTable.jsx             Scrollable trade log with full fee breakdown
│   │   └── TradeForm.jsx              Add/edit trade modal with live net EUR preview
│   ├── Alerts/
│   │   └── AlertBanner.jsx            Fixed top banner, self-contained, shown on all pages
│   └── UI/
│       ├── SideNav.jsx                Bottom navigation (5 tabs)
│       └── StatusBadge.jsx            Coloured pill for SCALP / CONVICTION / thesis states
│
├── hooks/
│   ├── useNVDAData.js                 Polls /api/price every 60s
│   ├── useMacroData.js                Polls /api/macro every 5min
│   ├── useNews.js                     Polls /api/news every 15min
│   ├── useFundamentals.js             Fetches /api/fundamentals once on mount
│   └── useAlerts.js                   Alert engine, price buffer, sessionStorage dedup
│                                      Accepts optional externalPriceData + externalMacroData
│                                      to avoid duplicate polling when dashboard hooks are mounted
│
└── lib/
    ├── redis.js                       getRedis() factory — import this, never define locally
    ├── safeParse.js                   Handles Upstash dual return format (string or object)
    ├── config.js                      EARNINGS_DATE, FOMC_DATE, CONFIG_DEFAULTS, getBaseUrl()
    ├── format.js                      fmtUSD, fmtEUR, pnlColor — Track components only
    ├── calculations.js                Live P&L formula, projections, erosion day, daysUntil
    ├── tradeCalculations.js           Closed trade P&L including platform fee
    ├── thesisEngine.js                getThesisStatus(), getBuyChecklist()
    ├── alertEngine.js                 5 pure alert check functions (used by useAlerts only)
    ├── newsClassifier.js              classifyWithKeywords(), classifyWithClaude()
    ├── formatBrief.js                 formatBrief() — packages all data for Anthropic prompt
    └── sessionUtils.js                getMarketSession(), getCountdown() — ET timezone safe
```

---

## Shared Library Guide

Read this before creating any new utility function.
If what you need is listed here, import it — do not redefine it elsewhere.

| File | What it does | Use when |
|------|-------------|----------|
| `lib/redis.js` | Creates Upstash Redis client | Any API route that reads or writes KV |
| `lib/safeParse.js` | Safely parses KV values | Any API route reading from KV |
| `lib/config.js` | Central constants and base URL helper | Anywhere EARNINGS_DATE, FOMC_DATE, CONFIG_DEFAULTS, or getBaseUrl() is needed |
| `lib/format.js` | Currency formatters and P&L colour | Track page components only |
| `lib/calculations.js` | Live position P&L, projections, erosion day | Dashboard, trade page, checklist API |
| `lib/tradeCalculations.js` | Closed trade P&L with platform fee | Track API and Track page only |
| `lib/thesisEngine.js` | Thesis status and buy checklist logic | Dashboard, trade page, checklist API |
| `lib/alertEngine.js` | Five pure alert trigger functions | useAlerts hook only |
| `lib/newsClassifier.js` | Keyword and Claude news classification | news API and analysis API only |
| `lib/formatBrief.js` | Formats live data for Anthropic | analysis API only |
| `lib/sessionUtils.js` | ET market session and countdown | NVDALiveContext and LivePriceBubble only |

---

## Phase Status

- Phase 1: COMPLETE — Dashboard, live data, all numbers verified
- Phase 2: COMPLETE — AI analysis, news classification, Give Me A Read, history tabs
- Phase 3: DEFERRED — Voice loop (ElevenLabs credentials not yet configured)
- Phase 4: COMPLETE — Pre-trade checklist, P&L calculation verified
- Phase 5: COMPLETE — Alert system, all 5 triggers tested
- Phase 6: COMPLETE — LivePriceBubble, WebSocket, session-aware (premarket/open/afterhours/closed)
- Phase 7: COMPLETE — Track page, trade log, CRUD, P&L summary cards
- Consolidation (2026-04-15): Shared lib files extracted, duplicate polling fixed,
  news double-classification fixed, hasBucketCNews ms/s bug fixed, dead files deleted

---

## Thesis Status Logic (thesisEngine.js)

INTACT (default — no AT RISK conditions active):
Price above 200 SMA, no macro stress, no Bucket C news in 24h.

AT RISK (any one triggers):
- Price within 0-5% below 200 SMA
- Oil up more than 5% over past 2 sessions
- VIX above 30
- Bucket C news detected in past 24h

BROKEN:
- Price more than 5% below 200 SMA (sustained)

---

## Buy Checklist — 6 Conditions (thesisEngine.js)

1. Price within 3% of 200 SMA or below it
2. Analyst consensus more than 20% above current price
3. No Bucket C news in past 24h
4. QQQ not down more than 1.5% today
5. VIX below 30
6. Not within 3 days of earnings

---

## News Bucket Definitions (newsClassifier.js)

Bucket A — Noise:
General AI commentary, minor analyst tweaks, sector rotation,
options flow, small price target changes.

Bucket B — Thesis Support:
Hyperscaler capex increases, data centre AI investment,
Jensen Huang positive comments, NVDA product wins,
earnings beats, analyst upgrades.

Bucket C — Thesis Risk:
Export restrictions on H100/H200/Blackwell chips,
hyperscaler capex cuts, AI spending slowdown,
major customer loss, antitrust action, competing chip threat.

Dashboard shows keyword-only classification (free, runs on every 15min news refresh).
Give Me A Read re-classifies ambiguous null-bucket articles using Claude (costs tokens, on demand only).

---

## UI Rules

- Read DESIGN.md before making any UI-related change. DESIGN.md is
  the design authority. CLAUDE.md defers to it on all visual decisions.
- Background: #0d0d14 base with soft blue-indigo bloom overlays
  (see DESIGN.md atmosphere section for exact implementation)
- Mobile-first, 390px primary width (iPhone 14)
- Every screen readable in 30 seconds
- Navigation: floating pill at top of screen with sliding active
  indicator — see DESIGN.md navigation section. Not a side rail.
- Fonts: Inter for hero numbers and body text, JetBrains Mono for
  all financial data, tables, and labels
- Green = profit/positive only. Red = loss/negative only.
  Amber = caution only. Blue = informational/identity only.
  No colour used decoratively — see DESIGN.md colour section.
- No scrolling on dashboard — everything above fold
- No charting (owner uses TradingView for charts)
- No order execution
- NVDA only — do not generalise to other tickers

---

## High-ROI Signals (ranked by trading impact)

1. Brent crude oil direction — inverse correlation to NVDA
2. Iran/Hormuz status — dominant macro narrative until approximately June 24, 2026
3. QQQ direction — NVDA beta 1.93, amplifies Nasdaq moves
4. VIX level — above 30 is the opportunity zone
5. Fed rate cut probability — higher cuts expected = bullish for NVDA
6. Hyperscaler capex announcements — MSFT, GOOG, AMZN, META
7. Analyst consensus gap vs current price
8. Days to earnings — conviction hold viability window