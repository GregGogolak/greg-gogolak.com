# Read Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Give Me A Read page with persistent history tabs (last 5 reads, stored in Redis) and a sleeker accent-bordered card layout.

**Architecture:** The API GET handler is updated to return the full history list from a new `analysis:history` Redis list key; the POST handler writes to both the existing `analysis:latest` key and the new list. The read page is fully rewritten to drive its UI from the history array — tabs, active read display, shimmer loading, and in-place Market Pulse expansion.

**Tech Stack:** Next.js 15 App Router, React, Tailwind CSS, Upstash Redis (`@upstash/redis`)

---

## File Map

| File | Change |
|---|---|
| `app/api/analysis/route.js` | GET returns history list; POST also writes to `analysis:history` |
| `app/read/page.jsx` | Full rewrite — history tabs, accent cards, shimmer, in-place pulse |

---

### Task 1: Update API GET to return history list

**Files:**
- Modify: `app/api/analysis/route.js` (GET handler only, lines 24–34)

- [ ] **Step 1: Replace the GET handler**

Open `app/api/analysis/route.js`. Replace the entire `GET` export with:

```js
// GET — return full history list for tab population
export async function GET() {
  try {
    const redis = getRedis()
    if (!redis) return Response.json([])
    const history = await redis.lrange('analysis:history', 0, 4)
    return Response.json(Array.isArray(history) ? history : [])
  } catch {
    return Response.json([])
  }
}
```

- [ ] **Step 2: Verify with curl (dev server must be running: `npm run dev`)**

```bash
curl -s http://localhost:3000/api/analysis | head -c 200
```

Expected output: `[]` (empty array if no history yet) or a JSON array of objects. Must not return `{ cached: false }` anymore.

- [ ] **Step 3: Commit**

```bash
git add app/api/analysis/route.js
git commit -m "feat: GET /api/analysis returns history list from Redis"
```

---

### Task 2: Update API POST to write to history list

**Files:**
- Modify: `app/api/analysis/route.js` (Redis write block inside POST, ~lines 154–158)

- [ ] **Step 1: Find the Redis write block in the POST handler**

It currently reads:

```js
    // Cache in Redis (without fromCache flag)
    if (redis) {
      const { fromCache: _fc, ...toCache } = result
      await redis.set(CACHE_KEY, toCache, { ex: CACHE_TTL_S })
    }
```

- [ ] **Step 2: Replace it with writes to both keys**

```js
    // Cache in Redis (without fromCache flag)
    if (redis) {
      const { fromCache: _fc, ...toCache } = result
      await redis.set(CACHE_KEY, toCache, { ex: CACHE_TTL_S })
      await redis.lpush('analysis:history', toCache)
      await redis.ltrim('analysis:history', 0, 4)
    }
```

`lpush` prepends the newest result so index 0 is always the most recent. `ltrim 0 4` keeps exactly 5 items.

- [ ] **Step 3: Verify — trigger a new read and check history**

```bash
# Trigger a new analysis (requires valid API keys in .env.local)
curl -s -X POST http://localhost:3000/api/analysis | python3 -m json.tool | head -30

# Then confirm it appears in the list
curl -s http://localhost:3000/api/analysis | python3 -m json.tool | head -30
```

Expected: GET now returns a 1-item array containing the result from POST. The `generatedAt` fields should match.

- [ ] **Step 4: Commit**

```bash
git add app/api/analysis/route.js
git commit -m "feat: POST /api/analysis writes to analysis:history list (max 5)"
```

---

### Task 3: Rewrite read page — history state + tab strip

**Files:**
- Modify: `app/read/page.jsx` (full rewrite)

- [ ] **Step 1: Replace the entire file with the new shell (state + tabs, no output sections yet)**

```jsx
'use client'

import { useState, useEffect } from 'react'

const ACTION_TAB = {
  BUY:   'border-emerald-700 text-emerald-400 bg-emerald-500/10',
  WAIT:  'border-amber-700   text-amber-400   bg-amber-500/10',
  HOLD:  'border-blue-700    text-blue-400    bg-blue-500/10',
  AVOID: 'border-red-700     text-red-400     bg-red-500/10',
}

function tabLabel(read) {
  const action = read.recommendedAction?.action ?? '??'
  const time   = new Date(read.generatedAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return `${action} ${time}`
}

function timeAgo(val) {
  const ms   = val > 1e12 ? val : val * 1000
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} mins ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function ReadPage() {
  const [history,   setHistory]   = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [pulseOpen, setPulseOpen] = useState(false)

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data)
          setActiveIdx(0)
        }
      })
      .catch(() => {})
  }, [])

  async function handleNewRead() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analysis', { method: 'POST' })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      const result = await res.json()
      setHistory(prev => [result, ...prev].slice(0, 5))
      setActiveIdx(0)
      setPulseOpen(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(idx) {
    setActiveIdx(idx)
    setPulseOpen(false)
  }

  const data = history[activeIdx] ?? null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#eef2ff] px-4 py-6 pb-24 max-w-[480px] mx-auto">
      <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-4">GIVE ME A READ</p>

      {/* Tab strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-1 border-b border-white/[0.03]"
        style={{ scrollbarWidth: 'none' }}
      >
        {history.map((read, i) => {
          const action = read.recommendedAction?.action
          const isActive = i === activeIdx
          return (
            <button
              key={read.generatedAt}
              onClick={() => switchTab(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide border transition-colors ${
                isActive && ACTION_TAB[action]
                  ? ACTION_TAB[action]
                  : 'border-white/5 text-gray-600 hover:border-white/10 hover:text-gray-500'
              }`}
            >
              {tabLabel(read)}
            </button>
          )
        })}
        <button
          onClick={handleNewRead}
          disabled={loading}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide border transition-colors disabled:cursor-not-allowed ${
            loading
              ? 'border-blue-700 text-blue-400 bg-blue-500/10'
              : 'border-white/5 text-gray-600 hover:border-blue-700/50 hover:text-blue-400'
          }`}
        >
          {loading ? 'ANALYSING…' : '+ NEW READ'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs font-mono text-center my-3">{error}</p>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <p className="text-[11px] font-mono text-gray-600 text-center mt-8">
          No reads yet — tap + NEW READ
        </p>
      )}

      {/* Output sections placeholder — replaced in Task 4 */}
      {data && !loading && (
        <p className="text-gray-600 text-xs font-mono text-center mt-6">sections coming…</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify tabs render**

```bash
npm run dev
```

Open http://localhost:3000/read. Expected:
- If Redis has existing history: tabs appear with `BUY HH:MM` labels, correct action colors on the active tab
- If no history: "No reads yet — tap + NEW READ" message
- Tapping `+ NEW READ` shows `ANALYSING…` while in flight and adds a tab on completion

- [ ] **Step 3: Commit**

```bash
git add app/read/page.jsx
git commit -m "feat: read page — history tabs with action-color pills"
```

---

### Task 4: Add accent-bordered output sections

**Files:**
- Modify: `app/read/page.jsx`

- [ ] **Step 1: Add color constant maps at the top of the file (after `ACTION_TAB`)**

Insert these after the `ACTION_TAB` constant:

```js
const ACTION_SECTION = {
  BUY:   'border-l-emerald-600 bg-emerald-500/[0.04] border-emerald-500/20',
  WAIT:  'border-l-amber-600   bg-amber-500/[0.04]   border-amber-500/20',
  HOLD:  'border-l-blue-600    bg-blue-500/[0.04]    border-blue-500/20',
  AVOID: 'border-l-red-600     bg-red-500/[0.04]     border-red-500/20',
}

const ACTION_TEXT = {
  BUY:   'text-emerald-400',
  WAIT:  'text-amber-400',
  HOLD:  'text-blue-400',
  AVOID: 'text-red-400',
}
```

- [ ] **Step 2: Replace the `{data && !loading && (...)}` block (currently showing "sections coming…") with the full output**

```jsx
      {data && !loading && (
        <>
          {/* Cache age */}
          <p className="text-[10px] font-mono text-gray-700 text-center my-3">
            {activeIdx === 0 && !data.fromCache
              ? 'fresh read'
              : `${new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · ${timeAgo(data.generatedAt)}`}
          </p>

          <div className="space-y-2">

            {/* 1 — Undervalued */}
            {(() => {
              const ans     = data.undervalued?.answer
              const border  = ans === 'Yes' ? 'border-l-emerald-600' : 'border-l-red-600'
              const ansText = ans === 'Yes' ? 'text-emerald-400'     : 'text-red-400'
              return (
                <div className={`rounded-lg border border-white/[0.03] border-l-2 ${border} bg-white/[0.018] p-4`}>
                  <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">UNDERVALUED?</p>
                  <p className={`text-xl font-mono font-bold mb-1 ${ansText}`}>{ans}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{data.undervalued?.reason}</p>
                </div>
              )
            })()}

            {/* 2 — Why at this level */}
            <div className="rounded-lg border border-white/[0.03] border-l-2 border-l-amber-700 bg-white/[0.018] p-4">
              <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">WHY AT THIS LEVEL?</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">{data.whyAtThisLevel}</p>
            </div>

            {/* 3 — What resolves it */}
            <div className="rounded-lg border border-white/[0.03] border-l-2 border-l-blue-700 bg-white/[0.018] p-4">
              <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">WHAT RESOLVES IT?</p>
              <ul className="space-y-1.5">
                {(Array.isArray(data.whatResolvesIt) ? data.whatResolvesIt : []).map((item, i) => (
                  <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                    <span className="text-blue-500 font-mono shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 4 — Recommended action */}
            {(() => {
              const action  = data.recommendedAction?.action
              const section = ACTION_SECTION[action] ?? 'border-l-gray-700 bg-white/[0.018] border-white/[0.03]'
              const text    = ACTION_TEXT[action]    ?? 'text-white'
              return (
                <div className={`rounded-lg border border-l-2 p-4 ${section}`}>
                  <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">RECOMMENDED ACTION</p>
                  <p className={`text-2xl font-mono font-bold mb-1 ${text}`}>{action}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{data.recommendedAction?.reason}</p>
                </div>
              )
            })()}

          </div>
        </>
      )}
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:3000/read with a read already in history (or trigger a new one). Expected:
- UNDERVALUED? card: green left border + green "Yes" if Yes, red if No
- WHY AT THIS LEVEL?: amber left border
- WHAT RESOLVES IT?: blue left border, bullet list with `›` 
- RECOMMENDED ACTION: action-coloured border + subtle tint background, large action word in matching colour

- [ ] **Step 4: Commit**

```bash
git add app/read/page.jsx
git commit -m "feat: read page — accent-bordered output sections"
```

---

### Task 5: Add Market Pulse in-place expand

**Files:**
- Modify: `app/read/page.jsx`

- [ ] **Step 1: Append Market Pulse card inside the `<div className="space-y-2">` block, after the RECOMMENDED ACTION card**

Add this immediately before the closing `</div>` of `space-y-2`:

```jsx
            {/* 5 — Market Pulse */}
            <button
              onClick={() => setPulseOpen(o => !o)}
              className="w-full rounded-lg border border-white/[0.03] border-l-2 border-l-gray-800 bg-white/[0.018] p-4 text-left hover:bg-white/[0.025] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-mono text-gray-600 tracking-widest">MARKET PULSE</p>
                <span className="text-gray-700 font-mono text-[9px]">{pulseOpen ? '▲' : '▼'}</span>
              </div>

              {!pulseOpen ? (
                <div className="flex gap-2">
                  <div className="flex-1 border border-white/[0.03] rounded-md px-3 py-2">
                    <p className="text-[8px] font-mono text-gray-700 tracking-widest mb-1">RETAIL</p>
                    <p className="text-[10px] text-gray-400">{data.marketPulse?.retail?.label}</p>
                  </div>
                  <div className="flex-1 border border-white/[0.03] rounded-md px-3 py-2">
                    <p className="text-[8px] font-mono text-gray-700 tracking-widest mb-1">HEDGE FUND</p>
                    <p className="text-[10px] text-gray-400">{data.marketPulse?.hedge?.label}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mt-1">
                  <div>
                    <p className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">RETAIL</p>
                    <p className="text-[11px] font-mono text-gray-300 mb-1">{data.marketPulse?.retail?.label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{data.marketPulse?.retail?.summary}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">HEDGE FUND</p>
                    <p className="text-[11px] font-mono text-gray-300 mb-1">{data.marketPulse?.hedge?.label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{data.marketPulse?.hedge?.summary}</p>
                  </div>
                </div>
              )}
            </button>
```

- [ ] **Step 2: Verify in browser**

Expected:
- Collapsed: two side-by-side chips showing RETAIL label and HEDGE FUND label
- Tapping expands in-place to show full label + summary for each
- Switching tabs resets pulse to collapsed (already handled by `switchTab()` and `handleNewRead()`)

- [ ] **Step 3: Commit**

```bash
git add app/read/page.jsx
git commit -m "feat: read page — market pulse in-place expand (no popup)"
```

---

### Task 6: Add shimmer loading skeleton

**Files:**
- Modify: `app/read/page.jsx`

- [ ] **Step 1: Add the shimmer block — insert it between the empty-state paragraph and the `{data && !loading && ...}` block**

```jsx
      {/* Shimmer skeleton — shown while a new read is in flight */}
      {loading && (
        <div className="space-y-2 mt-4">
          {[72, 88, 65, 55].map((w, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/[0.03] border-l-2 border-l-gray-800 bg-white/[0.018] p-4"
            >
              <div
                className="h-2 rounded bg-white/[0.05] animate-pulse mb-3"
                style={{ width: `${w}%` }}
              />
              <div
                className="h-2 rounded bg-white/[0.03] animate-pulse"
                style={{ width: `${w - 18}%` }}
              />
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 2: Verify in browser**

Tap `+ NEW READ`. Expected:
- Tab slot immediately shows `ANALYSING…` in blue
- Four shimmer cards animate below while the request is in flight
- On completion the shimmer disappears and the new read renders

- [ ] **Step 3: Commit**

```bash
git add app/read/page.jsx
git commit -m "feat: read page — shimmer skeleton during analysis"
```

---

## Self-Review Checklist (for implementer)

After all tasks are done, verify:

- [ ] GET `/api/analysis` returns a JSON array (not an object)
- [ ] POST `/api/analysis` result appears as `history[0]` in the next GET call
- [ ] Redis list never exceeds 5 items (`LTRIM 0 4`)
- [ ] `analysis:latest` still written on POST (dashboard sentiment chip depends on it)
- [ ] Tabs: active tab shows action colour, inactive tabs are dim
- [ ] Switching tabs resets Market Pulse to collapsed
- [ ] Empty state shows when no history and not loading
- [ ] Shimmer shows only when `loading === true`
- [ ] UNDERVALUED border is green for Yes, red for No
- [ ] RECOMMENDED ACTION section uses the action tint background
