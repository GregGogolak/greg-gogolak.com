# NVDA Jarvis — Pages and Components Reference

## Route Map
/ — Dashboard (app/page.jsx)
/read — Give Me A Read (app/read/page.jsx)
/trade — Pre-Trade Checklist (app/trade/page.jsx)
/alerts — Alert Config (app/alerts/page.jsx)
/track — Trade History (app/track/page.jsx)
/ledger — Leaderboard (app/ledger/page.jsx)
/brief — Daily Brief (app/brief/page.jsx)
/sign-in — Login (app/sign-in/[[...sign-in]]/page.jsx)

## API Routes
/api/price — NVDA quote (Finnhub), SMAs + RSI (Twelve Data), market status
/api/macro — QQQ (Finnhub), Brent (OilPriceAPI + Twelve Data fallback), VIX (Yahoo)
/api/news — NVDA news (Finnhub), keyword-classified A/B/C buckets
/api/fundamentals — Analyst target, PE, EPS (Alpha Vantage, 6hr Redis cache)
/api/analysis — Give Me A Read (Anthropic, 30min Redis cache)
/api/checklist — Pre-trade eval (Anthropic, on demand)
/api/positions — Open positions CRUD + DELETE close flow
/api/trades — Closed trade history CRUD
/api/trades/bulk — Bulk import endpoint
/api/trades/parse-csv — AI CSV parsing (Anthropic)
/api/platform-fees — Cross-user date map for shared platform fee calculation
/api/calendar — AI calendar events (Anthropic, 1hr Redis cache)
/api/ledger — All users stats, equity curves, all open positions
/api/payouts — Payout records CRUD per user
/api/alerts — Alert config + custom price levels (Redis CRUD)

## Dashboard Layout (3x3 grid)
Row 1: Price card | Thesis card | Market card
Row 2: Technicals card | News Feed (5B + 5C) | Calendar Events (AI)
Row 3: Positions card | Position Moves (placeholder) | Jarvis Talk (placeholder)

## Technicals Card Data Rows
200 SMA — from priceData (Twelve Data)
50 SMA — from priceData (Twelve Data)
RSI 15m — from priceData (Twelve Data, 5min cache)
QQQ — from macroData (Finnhub)
VIX — from macroData (Yahoo Finance)
Brent Crude — from macroData (OilPriceAPI + Twelve Data fallback)
Analyst Target — from fundamentalsData (Alpha Vantage)

## Thesis Status Logic
INTACT: price above 200 SMA, no macro stress, no Bucket C news in 24h
AT RISK (any one): price 0-5% below 200 SMA, oil up >5%, VIX >30, Bucket C news in 24h
BROKEN: price >5% below 200 SMA sustained

## Buy Checklist (6 conditions)
1. Price within 3% of 200 SMA or below it
2. Analyst consensus >20% above current price
3. No Bucket C news in past 24h
4. QQQ not down >1.5% today
5. VIX below 30
6. Not within 3 days of earnings

## News Buckets
A — Noise: general AI commentary, minor analyst tweaks, sector rotation
B — Thesis Support: hyperscaler capex, Jensen positive, NVDA product wins, earnings beats
C — Thesis Risk: export restrictions, capex cuts, AI slowdown, antitrust, competing chips

## Track Page Sections (top to bottom)
1. Header row — Import CSV, + Open Position, + Add Trade buttons
2. Summary cards (8 cards, 2 rows of 4)
3. Open Positions section — live estimated P&L, close button with form, include-in-totals toggle
4. Payouts section — table with date/amount, remaining balance summary card
5. Trade Log — sortable table with shared fee column

## Ledger Page Sections (top to bottom)
1. Constellation background (canvas, fixed)
2. Scan line animation
3. Hero — fund total with count-up, stat cluster, live badge
4. Equity Curves — canvas chart, all members' cumulative P&L, draws left to right on load
5. Members — ranked cards with progress bars, shimmer on #1, stat pills
6. Awards — 6 mini cards (most profitable, best win rate, best single trade, best month, most disciplined, most active)
7. All Open Positions — read-only overview of every user's open positions

## Login Page
Cloud atmosphere background (5 animated radial gradient divs, CSS keyframes)
Frosted glass panel (backdrop-filter blur 48px, rgba(220,225,255,0.06))
App identity (NVDA Jarvis, Trading Terminal)
Clerk SignIn component with full appearance overrides
Enter key submits form

## Environment Variables
FINNHUB_API_KEY — server-side
NEXT_PUBLIC_FINNHUB_API_KEY — client-side WebSocket
ALPHA_VANTAGE_API_KEY — server-side
TWELVE_DATA_API_KEY — server-side
OIL_PRICE_API_KEY — server-side
ANTHROPIC_API_KEY — server-side
ELEVENLABS_API_KEY — server-side (Phase 3, unused)
ELEVENLABS_VOICE_ID — server-side (Phase 3, unused)
UPSTASH_REDIS_REST_URL — server-side
UPSTASH_REDIS_REST_TOKEN — server-side