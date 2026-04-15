# Phase 2 — Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add on-demand AI analysis ("Give Me A Read"), hybrid news classification (keyword + Claude), and a Market Pulse section showing retail/hedge fund sentiment — all triggered by a single button press with 30-min KV cache to control token cost.

**Architecture:** When the user presses "Give Me A Read", a single POST to `/api/analysis` fetches all live data, runs hybrid news classification (keywords first, Claude only for ambiguous articles), formats a data brief, calls Claude once for a 6-part analysis (4-question read + retail/hedge sentiment), and caches the result in Redis for 30 minutes. The dashboard news panel gets keyword-only bucket labels on every 15-min news refresh — zero Claude cost. The dashboard shows a compact sentiment chip from the last cached analysis result.

**Tech Stack:** Next.js 15 App Router, `@anthropic-ai/sdk`, `@upstash/redis` (already installed), Vitest for lib unit tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/newsClassifier.js` | Create | Keyword rules → bucket A/B/C; Claude batch classification for ambiguous |
| `lib/formatBrief.js` | Create | Assembles price/macro/news/positions into Claude prompt string |
| `app/api/analysis/route.js` | Create | Orchestration: fetch → classify → brief → Claude → Redis cache |
| `app/api/news/route.js` | Modify | Add keyword bucket label to each article in response |
| `components/Dashboard/NewsPanel.jsx` | Modify | Show live bucket label chip on each article |
| `app/read/page.jsx` | Replace | Full Give Me A Read UI: button, 4-section output, Market Pulse popup |
| `app/page.jsx` | Modify | Add SentimentChip reading last cached analysis |
| `lib/__tests__/newsClassifier.test.js` | Create | Unit tests for keyword classifier |
| `lib/__tests__/formatBrief.test.js` | Create | Unit tests for brief assembly |

---

## Task 1: Install dependencies + set up Vitest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd "/Users/greg/Documents/Coding/NVDA Trading Co-Pilot "
npm install @anthropic-ai/sdk
npm install --save-dev vitest
```

- [ ] **Step 2: Add test script to `package.json`**

Add `"test": "vitest run"` to the scripts block. The full scripts section becomes:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build --turbopack",
  "start": "next start",
  "test": "vitest run"
}
```

- [ ] **Step 3: Verify Vitest works**

```bash
npm test -- --passWithNoTests
```

Expected output: `No test files found, exiting with code 0` (or similar pass with no tests).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add anthropic sdk + vitest"
```

---

## Task 2: Build keyword news classifier

**Files:**
- Create: `lib/newsClassifier.js`
- Create: `lib/__tests__/newsClassifier.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/newsClassifier.test.js`:

```javascript
import { describe, test, expect } from 'vitest'
import { classifyWithKeywords } from '../newsClassifier.js'

describe('classifyWithKeywords', () => {
  // Bucket C — thesis risk (must never be missed)
  test('export restriction → C', () => {
    expect(classifyWithKeywords('US expands export restrictions on H100 chips to China')).toBe('C')
  })
  test('export ban on Blackwell → C', () => {
    expect(classifyWithKeywords('Biden admin to ban Blackwell chip exports to Middle East')).toBe('C')
  })
  test('hyperscaler capex cut → C', () => {
    expect(classifyWithKeywords('Microsoft cuts data center capex by 20% amid AI slowdown')).toBe('C')
  })
  test('AI spending slowdown → C', () => {
    expect(classifyWithKeywords('Report: AI spending declines among major cloud providers')).toBe('C')
  })
  test('antitrust → C', () => {
    expect(classifyWithKeywords('DOJ launches antitrust investigation into Nvidia GPU monopoly')).toBe('C')
  })

  // Bucket B — thesis support
  test('hyperscaler capex increase → B', () => {
    expect(classifyWithKeywords('Amazon increases data center capex by $15B for AI expansion')).toBe('B')
  })
  test('Jensen Huang mention → B', () => {
    expect(classifyWithKeywords('Jensen Huang signals strong demand for Blackwell through 2026')).toBe('B')
  })
  test('analyst upgrade → B', () => {
    expect(classifyWithKeywords('Goldman raises Nvidia price target to $300 on AI demand')).toBe('B')
  })
  test('earnings beat → B', () => {
    expect(classifyWithKeywords('Nvidia earnings beat estimates by 12%, revenue guidance raised')).toBe('B')
  })
  test('contract win → B', () => {
    expect(classifyWithKeywords('Nvidia wins $2B AWS contract for Blackwell GPU clusters')).toBe('B')
  })

  // Bucket A — noise
  test('generic AI commentary → A', () => {
    expect(classifyWithKeywords('Analysts remain bullish on AI sector heading into Q2')).toBe('A')
  })
  test('sector rotation → A', () => {
    expect(classifyWithKeywords('Sector rotation into value stocks continues this week')).toBe('A')
  })
  test('options flow → A', () => {
    expect(classifyWithKeywords('Unusual options flow detected in semiconductor names')).toBe('A')
  })

  // Ambiguous → null (goes to Claude in /api/analysis)
  test('ambiguous export compliance mention → null', () => {
    expect(classifyWithKeywords('Nvidia discusses export compliance updates in annual filing')).toBeNull()
  })
  test('capex without direction → null', () => {
    expect(classifyWithKeywords('Meta outlines capex plans for next year at analyst day')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test lib/__tests__/newsClassifier.test.js
```

Expected: `Cannot find module '../newsClassifier.js'`

- [ ] **Step 3: Implement `lib/newsClassifier.js`**

Create `lib/newsClassifier.js`:

```javascript
import Anthropic from '@anthropic-ai/sdk'

// Patterns → Bucket C (Thesis Risk). C takes absolute priority.
const BUCKET_C_PATTERNS = [
  /export\s+(restrict|ban|control|limit|block)/i,
  /(H100|H200|Blackwell).{0,40}(ban|restrict|block|limit|prohibit)/i,
  /(ban|restrict|block|limit|prohibit).{0,40}(H100|H200|Blackwell)/i,
  /hyperscaler.{0,60}capex.{0,30}(cut|reduc|slow|declin|fall|drop)/i,
  /capex.{0,60}(cut|reduc|slow|declin|fall|drop).{0,60}(AI|data cent|cloud)/i,
  /AI\s+spending.{0,30}(slow|declin|cut|reduc|fall|drop)/i,
  /antitrust.{0,60}(nvidia|NVDA)/i,
  /(nvidia|NVDA).{0,60}antitrust/i,
]

// Patterns → Bucket B (Thesis Support)
const BUCKET_B_PATTERNS = [
  /hyperscaler.{0,60}capex.{0,30}(increas|grow|boost|expand|rise|hike|rais)/i,
  /capex.{0,60}(increas|grow|boost|expand|rise|hike).{0,60}(AI|data cent|cloud)/i,
  /Jensen\s+Huang/i,
  /earnings.{0,30}(beat|exceed|surpass|top\s+estimate)/i,
  /analyst.{0,30}(upgrad|rais.{0,10}target|increas.{0,10}target)/i,
  /price\s+target.{0,20}(rais|increas|upgrad|bump)/i,
  /(contract|deal)\s+(win|won|secure|award)/i,
  /(win|won|secure|award).{0,20}(contract|deal)/i,
  /Blackwell.{0,40}(launch|announc|ship|deliver|deploy|ramp)/i,
]

// Patterns → Bucket A (definite Noise)
const BUCKET_A_PATTERNS = [
  /sector\s+rotation/i,
  /options\s+flow/i,
  /short\s+interest/i,
  /technical\s+(analysis|breakdown|breakout|setup)/i,
]

/**
 * Keyword-only classification. No API calls. Returns 'A', 'B', 'C', or null.
 * null = ambiguous — send to Claude only inside /api/analysis.
 * On the dashboard (/api/news), null is treated as 'A'.
 *
 * @param {string} text - headline + summary concatenated
 * @returns {'A' | 'B' | 'C' | null}
 */
export function classifyWithKeywords(text) {
  if (!text) return 'A'

  const hasC = BUCKET_C_PATTERNS.some(p => p.test(text))
  const hasB = BUCKET_B_PATTERNS.some(p => p.test(text))

  // C always wins — never miss a risk signal
  if (hasC) return 'C'
  if (hasB) return 'B'

  const hasA = BUCKET_A_PATTERNS.some(p => p.test(text))
  if (hasA) return 'A'

  // No confident match — caller decides what to do (null → Claude in /api/analysis)
  return null
}

/**
 * Claude classifies a batch of ambiguous articles.
 * Called only from /api/analysis — never from /api/news.
 *
 * @param {Array<{headline: string, summary?: string}>} articles
 * @returns {Promise<Array<{...article, bucket: 'A'|'B'|'C', bucketReason: string}>>}
 */
export async function classifyWithClaude(articles) {
  if (!articles.length) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const articleList = articles
    .map((a, i) => `[${i}] ${a.headline}${a.summary ? ' — ' + a.summary.slice(0, 120) : ''}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Classify each NVDA news article. Reply with a JSON array only — no prose.

Bucket A = Noise: general AI commentary, minor analyst tweaks, sector rotation, options flow, small price target changes (<5%)
Bucket B = Thesis Support: hyperscaler capex increases, data centre AI investment, Jensen Huang positive comments, NVDA product launches, earnings beats, significant analyst upgrades
Bucket C = Thesis Risk: export restrictions on H100/H200/Blackwell, hyperscaler capex cuts, AI spending slowdowns, customer loss, antitrust, competing chip threats

Articles:
${articleList}

Reply format (same order as input):
[{"bucket":"A","reason":"brief reason"},{"bucket":"B","reason":"..."}]`,
    }],
  })

  const raw = response.content[0].text.trim()
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return articles.map(a => ({ ...a, bucket: 'A', bucketReason: 'classification failed' }))

  const classifications = JSON.parse(match[0])
  return articles.map((article, i) => ({
    ...article,
    bucket: classifications[i]?.bucket ?? 'A',
    bucketReason: classifications[i]?.reason ?? '',
  }))
}
```

- [ ] **Step 4: Run tests**

```bash
npm test lib/__tests__/newsClassifier.test.js
```

Expected: All 15 tests pass. If any Bucket C tests fail, tighten the matching regex in `BUCKET_C_PATTERNS`. If null tests fail, verify the text doesn't accidentally match a strong pattern.

- [ ] **Step 5: Commit**

```bash
git add lib/newsClassifier.js lib/__tests__/newsClassifier.test.js
git commit -m "feat: hybrid news classifier — keyword rules + claude batch fallback"
```

---

## Task 3: Build formatBrief.js

**Files:**
- Create: `lib/formatBrief.js`
- Create: `lib/__tests__/formatBrief.test.js`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/formatBrief.test.js`:

```javascript
import { describe, test, expect } from 'vitest'
import { formatBrief } from '../formatBrief.js'

const BASE = {
  price: { price: 110.50, pctChange: -1.2, sma200Pct: -2.1, sma50Pct: 0.5, volumeRatio: 1.4 },
  macro: {
    oil: { price: 82.50, pctChange: 1.2, twoSessionPct: 3.1 },
    qqq: { pctChange: -0.8 },
    vix: { level: 24.5 },
  },
  news: [
    { bucket: 'C', headline: 'US expands export ban on H100 chips', source: 'Reuters' },
    { bucket: 'A', headline: 'Analysts remain cautious on AI stocks', source: 'Bloomberg' },
  ],
  positions: [
    { type: 'CONVICTION', shares: 100, entryPrice: 115.00, daysHeld: 3, grossPnl: -450 },
  ],
  fundamentals: { analystTarget: 264, targetGapPct: 138.9, daysToEarnings: 36, daysToFomc: 14 },
}

describe('formatBrief', () => {
  test('returns a string', () => {
    expect(typeof formatBrief(BASE)).toBe('string')
  })
  test('includes current price', () => {
    expect(formatBrief(BASE)).toContain('110.50')
  })
  test('includes 200 SMA label', () => {
    expect(formatBrief(BASE)).toContain('200 SMA')
  })
  test('includes oil price', () => {
    expect(formatBrief(BASE)).toContain('82.50')
  })
  test('includes bucket C article', () => {
    const brief = formatBrief(BASE)
    expect(brief).toContain('[C]')
    expect(brief).toContain('export ban on H100')
  })
  test('includes analyst target', () => {
    expect(formatBrief(BASE)).toContain('264')
  })
  test('includes days to earnings', () => {
    expect(formatBrief(BASE)).toContain('36')
  })
  test('includes position type', () => {
    expect(formatBrief(BASE)).toContain('CONVICTION')
  })
  test('handles empty positions', () => {
    expect(formatBrief({ ...BASE, positions: [] })).toContain('None')
  })
  test('handles empty news', () => {
    expect(formatBrief({ ...BASE, news: [] })).toContain('No recent news')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test lib/__tests__/formatBrief.test.js
```

Expected: `Cannot find module '../formatBrief.js'`

- [ ] **Step 3: Implement `lib/formatBrief.js`**

Create `lib/formatBrief.js`:

```javascript
/**
 * Assembles all live trading data into a structured Claude prompt string.
 * Used exclusively by /api/analysis.
 *
 * @param {object} params
 * @param {object} params.price         - from /api/price: { price, pctChange, sma200Pct, sma50Pct, volumeRatio }
 * @param {object} params.macro         - from /api/macro: { oil: { price, pctChange, twoSessionPct }, qqq: { pctChange }, vix: { level } }
 * @param {Array}  params.news          - classified articles: [{ bucket, headline, source }]
 * @param {Array}  params.positions     - open positions: [{ type, shares, entryPrice, daysHeld, grossPnl }]
 * @param {object} params.fundamentals  - { analystTarget, targetGapPct, daysToEarnings, daysToFomc }
 * @returns {string}
 */
export function formatBrief({ price, macro, news, positions, fundamentals }) {
  const sign = n => (n == null ? '?' : (n >= 0 ? '+' : '') + Number(n).toFixed(2))

  const newsSection = !news?.length
    ? 'No recent news.'
    : news.map(a => `[${a.bucket}] ${a.headline} (${a.source})`).join('\n')

  const positionsSection = !positions?.length
    ? 'None'
    : positions.map(p =>
        `${p.type} — ${p.shares} shares @ $${Number(p.entryPrice).toFixed(2)}, held ${p.daysHeld}d, gross P&L: $${Number(p.grossPnl).toFixed(0)}`
      ).join('\n')

  return `NVDA TRADING BRIEF — ${new Date().toUTCString()}

PRICE:
- Current: $${Number(price.price).toFixed(2)} (${sign(price.pctChange)}% vs prev close)
- Distance from 200 SMA: ${sign(price.sma200Pct)}%
- Distance from 50 SMA: ${sign(price.sma50Pct)}%
- Volume vs 30d avg: ${Number(price.volumeRatio).toFixed(2)}x

FUNDAMENTALS:
- Analyst consensus target: $${fundamentals.analystTarget} (${sign(fundamentals.targetGapPct)}% above current)
- Days to earnings (May 20 2026, EPS est. $1.76, rev $78.42B): ${fundamentals.daysToEarnings}
- Days to FOMC (Apr 28-29 2026): ${fundamentals.daysToFomc}

MACRO:
- Brent crude: $${Number(macro.oil.price).toFixed(2)} (${sign(macro.oil.pctChange)}% today, ${sign(macro.oil.twoSessionPct)}% 2-session)
- QQQ: ${sign(macro.qqq.pctChange)}% today
- VIX: ${Number(macro.vix.level).toFixed(1)}

NEWS (last 48hrs — A=Noise B=Support C=Risk):
${newsSection}

OPEN POSITIONS:
${positionsSection}`
}
```

- [ ] **Step 4: Run tests**

```bash
npm test lib/__tests__/formatBrief.test.js
```

Expected: All 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/formatBrief.js lib/__tests__/formatBrief.test.js
git commit -m "feat: formatBrief assembles live data into claude prompt"
```

---

## Task 4: Add keyword classification to /api/news

**Files:**
- Modify: `app/api/news/route.js`

- [ ] **Step 1: Add import at the top of `app/api/news/route.js`**

Add this import as the first line of the file:

```javascript
import { classifyWithKeywords } from '@/lib/newsClassifier'
```

- [ ] **Step 2: Add `bucket` field in the article map**

Find the `.map(a => ({` block (the one that creates `{ id, headline, summary, url, source, image, datetime }`). Add one field:

```javascript
bucket: classifyWithKeywords(a.headline + ' ' + (a.summary || '')) ?? 'A',
```

The `?? 'A'` converts `null` (ambiguous) to `'A'` for the dashboard — no Claude cost here.

The full map block becomes:

```javascript
.map(a => ({
  id:       a.id,
  headline: a.headline,
  summary:  a.summary,
  url:      a.url,
  source:   a.source,
  image:    a.image || null,
  datetime: a.datetime,
  bucket:   classifyWithKeywords(a.headline + ' ' + (a.summary || '')) ?? 'A',
}))
```

- [ ] **Step 3: Verify the API returns bucket field**

Start the dev server (`npm run dev`) and in another terminal:

```bash
curl http://localhost:3000/api/news | jq '.articles[0]'
```

Expected: Response includes `"bucket": "A"` (or `"B"` or `"C"`).

- [ ] **Step 4: Commit**

```bash
git add app/api/news/route.js
git commit -m "feat: add keyword bucket classification to /api/news response"
```

---

## Task 5: Show bucket labels in NewsPanel

**Files:**
- Modify: `components/Dashboard/NewsPanel.jsx`

- [ ] **Step 1: Read the current file**

Read `components/Dashboard/NewsPanel.jsx` in full. Find where the bucket/noise pill is currently rendered (look for the hardcoded "NOISE" text or the existing bucket pill span).

- [ ] **Step 2: Add bucket config and replace the hardcoded pill**

Add this constant at the top of the file, outside the component:

```javascript
const BUCKET_CONFIG = {
  A: { label: 'NOISE',   className: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
  B: { label: 'SIGNAL',  className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  C: { label: 'RISK',    className: 'text-red-400 bg-red-400/10 border-red-400/20' },
}
```

Find the existing hardcoded bucket pill (the `<span>` that says "NOISE" or similar). Replace it with:

```jsx
{(() => {
  const cfg = BUCKET_CONFIG[article.bucket] ?? BUCKET_CONFIG.A
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
})()}
```

- [ ] **Step 3: Verify visually**

Open `http://localhost:3000`. Confirm news panel shows coloured bucket labels:
- `NOISE` → grey
- `SIGNAL` → green  
- `RISK` → red

- [ ] **Step 4: Commit**

```bash
git add components/Dashboard/NewsPanel.jsx
git commit -m "feat: live bucket labels (NOISE/SIGNAL/RISK) in dashboard news panel"
```

---

## Task 6: Create /api/analysis route

**Files:**
- Create: `app/api/analysis/route.js`

- [ ] **Step 1: Create the route**

Create `app/api/analysis/route.js`:

```javascript
import { Redis } from '@upstash/redis'
import Anthropic from '@anthropic-ai/sdk'
import { classifyWithKeywords, classifyWithClaude } from '@/lib/newsClassifier'
import { formatBrief } from '@/lib/formatBrief'
import { daysUntil } from '@/lib/calculations'

const CACHE_KEY = 'analysis:latest'
const CACHE_TTL_SEC = 30 * 60  // 30 minutes

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

// GET — return cached result for dashboard chip
export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) return Response.json({ cached: false })
    const cached = await redis.get(CACHE_KEY)
    if (cached) return Response.json({ ...cached, fromCache: true })
    return Response.json({ cached: false })
  } catch {
    return Response.json({ cached: false })
  }
}

// POST — on-demand analysis (returns cache if <30min old)
export async function POST() {
  try {
    const redis = getRedis()

    // Return cache if fresh
    if (redis) {
      const cached = await redis.get(CACHE_KEY)
      if (cached && Date.now() - cached.generatedAt < CACHE_TTL_SEC * 1000) {
        return Response.json({ ...cached, fromCache: true })
      }
    }

    // Fetch all data in parallel
    const [priceRes, macroRes, newsRes, fundamentalsRes, positionsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/price`),
      fetch(`${BASE_URL}/api/macro`),
      fetch(`${BASE_URL}/api/news`),
      fetch(`${BASE_URL}/api/fundamentals`),
      fetch(`${BASE_URL}/api/positions`),
    ])

    const [price, macro, newsData, fundamentals, positionsData] = await Promise.all([
      priceRes.json(),
      macroRes.json(),
      newsRes.json(),
      fundamentalsRes.json(),
      positionsRes.json(),
    ])

    // Hybrid classification: keyword first, Claude for ambiguous only
    const articles = newsData.articles || []
    const definite  = []
    const ambiguous = []

    for (const article of articles) {
      const bucket = classifyWithKeywords(article.headline + ' ' + (article.summary || ''))
      if (bucket !== null) {
        definite.push({ ...article, bucket })
      } else {
        ambiguous.push(article)
      }
    }

    const claudeClassified = ambiguous.length > 0
      ? await classifyWithClaude(ambiguous)
      : []

    const classifiedNews = [...definite, ...claudeClassified]

    // Compute derived fundamentals
    const analystTarget  = fundamentals.analystTarget ?? 264
    const targetGapPct   = ((analystTarget - price.price) / price.price) * 100
    const daysToEarnings = daysUntil('2026-05-20')
    const daysToFomc     = daysUntil('2026-04-28')

    // Format brief
    const brief = formatBrief({
      price,
      macro,
      news: classifiedNews,
      positions: positionsData.positions || [],
      fundamentals: { analystTarget, targetGapPct, daysToEarnings, daysToFomc },
    })

    // Single Claude call — all 6 outputs in one shot
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     'You are Jarvis, a concise NVDA trading analyst. Respond with valid JSON only — no markdown, no prose outside the JSON object.',
      messages: [{
        role:    'user',
        content: `Based on this NVDA brief, return ONLY a JSON object with this exact shape:

{
  "undervalued": { "answer": "Yes" or "No", "reason": "<one sentence>" },
  "whyAtThisLevel": "<one sentence>",
  "whatResolvesIt": ["<item, include date if applicable>", ...],
  "recommendedAction": { "action": "BUY" or "WAIT" or "HOLD" or "AVOID", "reason": "<one sentence>" },
  "marketPulse": {
    "retail": { "label": "<2-3 word mood>", "summary": "<one sentence>" },
    "hedge":  { "label": "<2-3 word mood>", "summary": "<one sentence>" }
  }
}

BRIEF:
${brief}`,
      }],
    })

    const raw   = message.content[0].text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned non-JSON')

    const analysis = JSON.parse(match[0])

    const result = {
      ...analysis,
      classifiedNews,
      generatedAt: Date.now(),
      fromCache:   false,
    }

    // Cache in Redis
    if (redis) {
      await redis.set(CACHE_KEY, JSON.stringify(result), { ex: CACHE_TTL_SEC })
    }

    return Response.json(result)
  } catch (err) {
    console.error('[/api/analysis]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Test the endpoint**

With `npm run dev` running, in another terminal:

```bash
curl -X POST http://localhost:3000/api/analysis | jq .
```

Expected response shape:
```json
{
  "undervalued": { "answer": "Yes", "reason": "..." },
  "whyAtThisLevel": "...",
  "whatResolvesIt": ["...", "..."],
  "recommendedAction": { "action": "BUY", "reason": "..." },
  "marketPulse": {
    "retail": { "label": "Fearful", "summary": "..." },
    "hedge":  { "label": "Accumulating", "summary": "..." }
  },
  "classifiedNews": [...],
  "generatedAt": 1713000000000,
  "fromCache": false
}
```

Re-run within 30 min — expect `"fromCache": true` and the same `generatedAt` timestamp.

- [ ] **Step 3: Commit**

```bash
git add app/api/analysis/route.js
git commit -m "feat: /api/analysis — on-demand claude analysis with 30min redis cache"
```

---

## Task 7: Build Give Me A Read page

**Files:**
- Replace: `app/read/page.jsx`

- [ ] **Step 1: Replace the stub**

Replace entire contents of `app/read/page.jsx`:

```jsx
'use client'

import { useState, useEffect } from 'react'

const ACTION_COLORS = {
  BUY:   'text-emerald-400',
  HOLD:  'text-blue-400',
  WAIT:  'text-yellow-400',
  AVOID: 'text-red-400',
}

function timeAgo(ms) {
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)  return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} mins ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function ReadPage() {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [pulseOpen,  setPulseOpen]  = useState(false)

  // Auto-load cached result on mount (no token cost)
  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(res => { if (res.fromCache) setData(res) })
      .catch(() => {})
  }, [])

  async function handleRead() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analysis', { method: 'POST' })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#eef2ff] px-4 py-6 pb-24 max-w-[480px] mx-auto">
      <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-4">GIVE ME A READ</p>

      {/* Trigger */}
      <button
        onClick={handleRead}
        disabled={loading}
        className="w-full py-3 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-sm tracking-wider hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
      >
        {loading ? 'ANALYSING...' : 'GIVE ME A READ'}
      </button>

      {/* Cache age */}
      {data?.generatedAt && (
        <p className="text-[11px] font-mono text-gray-600 text-center mb-6">
          {data.fromCache ? `cached — ${timeAgo(data.generatedAt)}` : 'fresh read'}
        </p>
      )}

      {error && (
        <p className="text-red-400 text-xs font-mono text-center mb-4">{error}</p>
      )}

      {/* Results */}
      {data?.undervalued && (
        <div className="space-y-3">

          {/* 1 — Undervalued */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">UNDERVALUED?</p>
            <p className={`text-xl font-mono font-bold mb-1 ${data.undervalued.answer === 'Yes' ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.undervalued.answer}
            </p>
            <p className="text-sm text-gray-300">{data.undervalued.reason}</p>
          </div>

          {/* 2 — Why */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">WHY AT THIS LEVEL?</p>
            <p className="text-sm text-gray-300">{data.whyAtThisLevel}</p>
          </div>

          {/* 3 — What resolves it */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-2">WHAT RESOLVES IT?</p>
            <ul className="space-y-1">
              {data.whatResolvesIt.map((item, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-blue-400 font-mono shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 4 — Recommended action */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">RECOMMENDED ACTION</p>
            <p className={`text-2xl font-mono font-bold mb-1 ${ACTION_COLORS[data.recommendedAction?.action] ?? 'text-white'}`}>
              {data.recommendedAction?.action}
            </p>
            <p className="text-sm text-gray-300">{data.recommendedAction?.reason}</p>
          </div>

          {/* Market Pulse — tappable popup */}
          <button
            onClick={() => setPulseOpen(o => !o)}
            className="w-full rounded-lg border border-white/5 bg-white/[0.03] p-4 text-left hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-gray-500 tracking-widest">MARKET PULSE</p>
              <span className="text-gray-600 font-mono text-xs">{pulseOpen ? '▲' : '▼'}</span>
            </div>

            {!pulseOpen ? (
              <div className="flex gap-4">
                <span className="text-xs font-mono text-gray-400">
                  🧑 <span className="text-white">{data.marketPulse?.retail?.label}</span>
                </span>
                <span className="text-xs font-mono text-gray-400">
                  🏦 <span className="text-white">{data.marketPulse?.hedge?.label}</span>
                </span>
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                <div>
                  <p className="text-[10px] font-mono text-gray-500 mb-0.5">🧑 RETAIL</p>
                  <p className="text-sm font-mono text-white mb-0.5">{data.marketPulse?.retail?.label}</p>
                  <p className="text-xs text-gray-400">{data.marketPulse?.retail?.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-500 mb-0.5">🏦 HEDGE FUND</p>
                  <p className="text-sm font-mono text-white mb-0.5">{data.marketPulse?.hedge?.label}</p>
                  <p className="text-xs text-gray-400">{data.marketPulse?.hedge?.summary}</p>
                </div>
              </div>
            )}
          </button>

        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Test the page**

Open `http://localhost:3000/read`. Verify:
- Page loads with "GIVE ME A READ" button
- If a cached result exists (from Task 6 testing), it loads automatically with "cached — X mins ago"
- Pressing the button runs analysis and renders all 4 sections
- Market Pulse expands/collapses on tap
- Pressing button again within 30 min shows cached timestamp, no additional Claude call

- [ ] **Step 3: Commit**

```bash
git add app/read/page.jsx
git commit -m "feat: give me a read page — 4-section output + market pulse popup"
```

---

## Task 8: Add sentiment chip to dashboard

**Files:**
- Modify: `app/page.jsx`

- [ ] **Step 1: Read the full `app/page.jsx`**

Read `app/page.jsx` to find the exact return JSX and where to insert the chip (look for where PricePanel and ThesisStatus are rendered).

- [ ] **Step 2: Add SentimentChip function and state**

`app/page.jsx` already imports `useEffect` and `useState`. Add a `SentimentChip` component at the top of the file, before the `Dashboard` export:

```jsx
function SentimentChip() {
  const [pulse, setPulse] = useState(null)

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(res => { if (res.fromCache && res.marketPulse) setPulse(res.marketPulse) })
      .catch(() => {})
  }, [])

  if (!pulse) return null

  return (
    <div className="flex gap-3 items-center px-3 py-2 rounded-lg border border-white/5 bg-white/[0.03] text-xs font-mono">
      <span className="text-gray-500 tracking-widest text-[10px]">PULSE</span>
      <span className="text-white">🧑 {pulse.retail.label}</span>
      <span className="text-gray-600">·</span>
      <span className="text-white">🏦 {pulse.hedge.label}</span>
    </div>
  )
}
```

- [ ] **Step 3: Insert `<SentimentChip />` into the dashboard JSX**

In the `Dashboard` component's return JSX, find a natural location near the top of the layout (e.g., after the page heading or before the first panel row). Add:

```jsx
<SentimentChip />
```

The chip renders nothing until a cached analysis exists, so it won't break the layout if no read has been triggered yet.

- [ ] **Step 4: Verify**

Open `http://localhost:3000`. If a read was triggered in Task 7, the chip should appear showing compact retail + hedge labels. If not, trigger a read from `/read` first, then return to dashboard.

- [ ] **Step 5: Commit**

```bash
git add app/page.jsx
git commit -m "feat: sentiment chip on dashboard — shows last cached market pulse"
```

---

## Task 9: Update CLAUDE.md phase status

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update phase status**

In `CLAUDE.md`, find:

```
## Phase Status (update this when phases complete)
- Phase 1: NOT STARTED
- Phase 2: NOT STARTED
```

Replace with:

```
## Phase Status (update this when phases complete)
- Phase 1: COMPLETE
- Phase 2: COMPLETE
- Phase 3: NOT STARTED
- Phase 4: NOT STARTED
- Phase 5: NOT STARTED
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: mark phase 1 and 2 complete"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Anthropic API integration | Task 6 |
| Hybrid classification (keyword + Claude for ambiguous) | Task 2 + Task 6 |
| Keyword-only on dashboard refresh (no token cost) | Task 4 |
| Bucket labels in dashboard news panel | Task 5 |
| Give Me A Read screen | Task 7 |
| Exact 4-question output format from spec | Task 7 |
| On-demand trigger only (no background polling) | Task 7 (button only) |
| 30-min KV cache to control token spend | Task 6 |
| Market Pulse — retail + hedge sentiment | Task 6 (Claude prompt) + Task 7 (UI) |
| Sentiment chip on dashboard | Task 8 |
| Dashboard prices + news stay real-time | Not touched — preserved from Phase 1 |
| Gate: brief answers 3 questions with real data | Task 6 manual curl test |

### Placeholder scan

No TBDs, no incomplete code blocks, no "handle edge cases" without specifics. All code shown in full.

### Type consistency

- `classifyWithKeywords` → `'A' | 'B' | 'C' | null` — consumed in Task 4 as `?? 'A'` and in Task 6 as null-check → Claude
- `classifyWithClaude` → `Article[]` with `bucket` and `bucketReason` fields added — matches spread usage in Task 6
- `formatBrief({ price, macro, news, positions, fundamentals })` — parameters match exactly what Task 6 passes
- `marketPulse.retail.label` / `marketPulse.hedge.label` — referenced identically in Task 7 (Read page) and Task 8 (chip)
- Redis client pattern (`new Redis({ url, token })`) — matches existing pattern in `positions/route.js`
