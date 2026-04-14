# NVDA Jarvis — Trading Assistant

## Project Overview
A Jarvis-style AI trading assistant for NVDA. Hosted on Vercel via Next.js 15. 
Mobile-first, dark mode, voice-enabled. The owner trades NVDA exclusively and 
needs a real-time right-hand man watching everything so he can be the final 
decision maker only.

## Core Philosophy
Every feature answers one of three questions only:
1. Is NVDA worth more than it's currently priced?
2. Why is it trading below fair value right now?
3. What will resolve that gap?

Reduce every output to yes/no or a clear recommended action. No walls of text. 
No raw data dumps. Everything interpreted.

## Owner Trading Context
- Trades NVDA only, up to 5,000 shares max
- Two trade types — label before entry, never switch mid-trade:
  - CONVICTION: days to weeks, thesis-based, hold through noise
  - SCALP: max 48hr hold, tight entry/exit, exit regardless if no hit in 48hrs
- Base currency: EUR
- Next earnings: May 20, 2026 (EPS est. $1.76, revenue $78.42B)
- FOMC: April 28-29, 2026

## Exact Cost Structure (use in all P&L calculations)
```
gross_pnl = (exit_price - entry_price) * shares
transaction_fees = (entry_price * shares * 0.001) + (exit_price * shares * 0.001)
interest_cost = entry_price * shares * 0.000212 * days_held
after_fees = gross_pnl - transaction_fees - interest_cost
after_split = after_fees * 0.50
after_tax = after_split * 0.90
net_eur = after_tax * 0.90
```
Interest: 7.74% annual = 0.0212%/day
Transaction fee: 0.1% each side
Commission split: 50%
Tax: 10%
FX: USD→EUR at 0.90

## Tech Stack
- Framework: Next.js 15 (App Router)
- Frontend: React + Tailwind CSS
- Backend: Next.js API routes → Vercel Serverless Functions
- Voice input: Web Speech API (browser native, no extra service)
- Voice output: ElevenLabs TTS
- AI layer: Anthropic API (claude-sonnet-4-6)
- Price/macro data: Finnhub API
- Fundamentals: Alpha Vantage API
- Persistence: Vercel KV (Redis, free tier)
- Hosting: Vercel (auto-deploy from GitHub)

## Environment Variables
```
FINNHUB_API_KEY=d7f3tlpr01qpjqqjc1cgd7f3tlpr01qpjqqjc1d0
ALPHA_VANTAGE_API_KEY=82N8723XA07AMYLL
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

## Project Structure
```
nvda-jarvis/
├── CLAUDE.md
├── .env.local
├── .gitignore
├── package.json
├── next.config.js
├── tailwind.config.js
│
├── app/
│   ├── layout.jsx
│   ├── page.jsx                  ← Dashboard (home)
│   ├── read/page.jsx             ← Give Me A Read
│   ├── trade/page.jsx            ← Pre-Trade Checklist
│   ├── alerts/page.jsx           ← Alert config
│   │
│   └── api/
│       ├── price/route.js        ← Finnhub: NVDA price + SMAs
│       ├── macro/route.js        ← Finnhub: oil, QQQ, VIX
│       ├── news/route.js         ← Finnhub: news + sentiment
│       ├── fundamentals/route.js ← Alpha Vantage: PE, consensus
│       ├── analysis/route.js     ← Anthropic: Give Me A Read
│       ├── checklist/route.js    ← Anthropic: pre-trade eval
│       ├── voice/route.js        ← ElevenLabs: TTS
│       └── positions/route.js    ← Vercel KV: position CRUD
│
├── components/
│   ├── Dashboard/
│   │   ├── PricePanel.jsx
│   │   ├── ThesisStatus.jsx
│   │   ├── MacroPanel.jsx
│   │   ├── PositionPanel.jsx
│   │   └── CatalystBar.jsx
│   ├── Voice/
│   │   ├── VoiceButton.jsx
│   │   └── AudioPlayer.jsx
│   ├── Alerts/
│   │   └── AlertBanner.jsx
│   └── UI/
│       ├── StatusBadge.jsx
│       └── CopyBrief.jsx
│
├── hooks/
│   ├── useNVDAData.js            ← polls /api/price every 60s
│   ├── useMacroData.js           ← polls /api/macro every 5min
│   ├── useNews.js                ← polls /api/news every 15min
│   └── useAlerts.js              ← threshold monitoring
│
└── lib/
    ├── calculations.js           ← exact P&L formula above
    ├── thesisEngine.js           ← INTACT/AT RISK/BROKEN logic
    ├── newsClassifier.js         ← Bucket A/B/C classification
    └── formatBrief.js            ← formats all data for Anthropic
```

## Build Phases — Do Not Skip Ahead

### Phase 1 — Dashboard + Live Data [CURRENT PHASE]
No AI calls. All data real and verified.

Required data on screen:
- NVDA price + % change from prev close
- % distance from daily 200 SMA (primary level)
- % distance from daily 50 SMA
- % below 10-day high
- Volume vs 30-day average (ratio)
- Thesis status: INTACT / AT RISK / BROKEN
- Brent oil price + % change
- QQQ % change
- VIX level
- Iran status toggle (manual: CEASEFIRE / ESCALATING / WAR)
- Days to earnings: May 20, 2026
- Days to FOMC: April 28, 2026
- Analyst consensus $264 vs current price (gap %)
- Open positions with gross + net P&L (live)
- Cash available (user input, persisted in KV)

Gate: every number verified against TradingView. P&L verified manually.

### Phase 2 — Intelligence Layer
Anthropic API. News classification. Give Me A Read screen.

Analysis output format (strict — no deviation):
1. UNDERVALUED? Yes/No + one sentence
2. WHY AT THIS LEVEL? Noise or thesis risk + one sentence  
3. WHAT RESOLVES IT? Bullet list with dates
4. RECOMMENDED ACTION: BUY / WAIT / HOLD / AVOID + one sentence

Gate: brief correctly answers three questions using real data.

### Phase 3 — Voice (Jarvis loop)
Web Speech API → transcribe → Anthropic → ElevenLabs → audio playback

Gate: full loop works on iPhone in under 10 seconds.

### Phase 4 — Pre-Trade Checklist
Input: entry price, shares, type
Output: checklist, net P&L at target, interest erosion day, 
        thesis field, wrong-condition field, confirmation step

Gate: P&L matches manual calculation exactly.

### Phase 5 — Alert System
Triggers: price drop >2% in 2hrs, custom price level hit,
          interest erosion >20%, oil >3% move, earnings 14/3 day warnings

Gate: test alert fires correctly.

## Thesis Status Logic (thesisEngine.js)

INTACT (all must be true):
- Price above daily 200 SMA
- Analyst consensus >20% above current price
- No Bucket C news in past 24hrs

AT RISK (any one triggers):
- Price within 2% below 200 SMA
- Oil up >5% in past 2 sessions
- VIX above 30
- Bucket C news detected

BROKEN:
- Price >5% below 200 SMA sustained
- Confirmed hyperscaler capex deterioration

## Buy Checklist (6 conditions)
1. Price within 3% of 200 SMA or below it
2. Analyst consensus >20% above current price
3. No Bucket C news in past 24hrs
4. QQQ not down >1.5% today
5. VIX below 30
6. Not within 3 days of earnings

## News Buckets

Bucket A — Noise (no action):
General AI commentary, minor analyst tweaks, sector rotation,
options flow commentary, small price target changes

Bucket B — Thesis Support (soft banner):
Hyperscaler AI contract wins, data centre capex increases,
Jensen Huang positive comments, NVDA product announcements,
earnings beats, analyst consensus upgrades

Bucket C — Thesis Risk (strong alert):
Export restrictions on H100/H200/Blackwell chips,
hyperscaler capex cuts, AI spending slowdown data,
major customer loss, antitrust action, competing chip threat

## High-ROI Signals (ranked by impact this month)
1. Brent crude oil direction (inverse to NVDA)
2. Iran/Hormuz status (war continues to ~June 24)
3. QQQ direction (NVDA beta 1.93)
4. VIX level (>30 = opportunity zone)
5. Fed rate cut probability
6. Hyperscaler capex announcements
7. Analyst consensus gap vs current price
8. Days to earnings

## UI Rules
- Background: #0a0a0a
- Mobile-first, 390px primary width
- Every screen readable in 30 seconds
- Green = buy signal, Yellow = watch, Red = risk
- Monospace font for all numbers
- No scrolling on dashboard
- Bottom navigation: Dashboard / Read / Trade / Alerts
- No charting, no order execution, NVDA only

## Phase Status (update this when phases complete)
- Phase 1: COMPLETE
- Phase 2: COMPLETE
- Phase 3: NOT STARTED
- Phase 4: NOT STARTED
- Phase 5: NOT STARTED

## Claude Code Session Rules
1. Read this file completely before any code
2. Confirm current phase before starting
3. Build only current phase scope
4. Never advance phase without owner confirmation
5. Always verify API calls return real data before marking done