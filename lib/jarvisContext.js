/**
 * Server-side context builder for the Jarvis voice agent.
 *
 * Each tool call from Vapi resolves to one function here. Output is a small,
 * flat, JSON-serialisable object with short field names and relative phrases
 * ("2 hours ago") suited to being spoken aloud by an LLM — no deep nesting,
 * no raw timestamps, no raw data dumps.
 *
 * All data comes from internal NVDA Jarvis API routes via getBaseUrl() —
 * this module never calls external APIs directly.
 */

import { getBaseUrl, EARNINGS_DATE, FOMC_DATE } from '@/lib/config'
import { daysUntil, calculateEstimatedPnL } from '@/lib/calculations'
import { getThesisStatus, getBuyChecklist } from '@/lib/thesisEngine'

const BASE = getBaseUrl()

async function fetchJson(path, init = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...init })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null
  const f = Math.pow(10, d)
  return Math.round(Number(n) * f) / f
}

/** Convert a unix seconds or ms timestamp into a spoken relative-time phrase. */
function relativeAge(ts) {
  if (!ts) return 'recent'
  const ms = ts > 1e12 ? ts : ts * 1000
  const diff = Date.now() - ms
  if (diff < 60_000)          return 'just now'
  if (diff < 3_600_000)       return `${Math.floor(diff / 60_000)} minutes ago`
  if (diff < 86_400_000)      return `${Math.floor(diff / 3_600_000)} hours ago`
  if (diff < 2 * 86_400_000)  return 'yesterday'
  return `${Math.floor(diff / 86_400_000)} days ago`
}

async function getLivePrice() {
  const p = await fetchJson('/api/price')
  if (!p) return null
  return {
    price:                     round(p.price, 2),
    pct_change_today:          round(p.pctChange, 2),
    sma_200:                   round(p.sma200, 2),
    sma_50:                    round(p.sma50, 2),
    distance_from_200_sma_pct: round(p.pctFrom200, 2),
    volume_ratio:              round(p.volumeRatio, 2),
  }
}

async function getMacro() {
  const m = await fetchJson('/api/macro')
  if (!m) return null

  // Iran flag lives on positions endpoint (shared KV key).
  // Webhook calls are server-to-server — no Clerk session — so the
  // auth-gated /api/positions call may return defaults. That's acceptable here
  // because Iran status is shared across users (not user-scoped) and the
  // positions route returns DEFAULTS (including iranStatus) on any failure.
  const pos = await fetchJson('/api/positions')

  return {
    brent_2day_pct:   round(m?.oil?.twoSessionPct, 2),
    qqq_day_pct:      round(m?.qqq?.pctChange, 2),
    vix:              round(m?.vix?.level, 1),
    iran_hormuz_flag: pos?.iranStatus ?? null,
  }
}

async function getThesis() {
  const [p, m, n] = await Promise.all([
    fetchJson('/api/price'),
    fetchJson('/api/macro'),
    fetchJson('/api/news'),
  ])
  const hasBucketCNews = Array.isArray(n?.articles)
    ? n.articles.some(a => a.bucket === 'C' && (Date.now() - (a.datetime > 1e12 ? a.datetime : a.datetime * 1000)) < 86_400_000)
    : false

  const t = getThesisStatus({
    price:             p?.price,
    sma200:            p?.sma200,
    oilTwoSessionPct:  m?.oil?.twoSessionPct ?? 0,
    vix:               m?.vix?.level ?? 0,
    hasBucketCNews,
  })

  return {
    status:  t.status,
    reasons: t.triggers,
  }
}

async function getChecklist() {
  const [p, m, n, f] = await Promise.all([
    fetchJson('/api/price'),
    fetchJson('/api/macro'),
    fetchJson('/api/news'),
    fetchJson('/api/fundamentals'),
  ])

  const hasBucketCNews = Array.isArray(n?.articles)
    ? n.articles.some(a => a.bucket === 'C' && (Date.now() - (a.datetime > 1e12 ? a.datetime : a.datetime * 1000)) < 86_400_000)
    : false

  const conditions = getBuyChecklist({
    price:           p?.price,
    sma200:          p?.sma200,
    analystTarget:   f?.analystTarget,
    hasBucketCNews,
    qqqPctChange:    m?.qqq?.pctChange ?? 0,
    vix:             m?.vix?.level ?? 0,
    daysToEarnings:  daysUntil(EARNINGS_DATE),
  }).map(c => ({ name: c.label, passing: c.pass, detail: c.value }))

  return {
    passing_count: conditions.filter(c => c.passing).length,
    total:         6,
    conditions,
  }
}

async function getPositions() {
  const [pos, p] = await Promise.all([
    fetchJson('/api/positions'),
    fetchJson('/api/price'),
  ])
  const positions = Array.isArray(pos?.positions) ? pos.positions : []
  const live = p?.price ?? null

  return {
    count:     positions.length,
    positions: positions.map(row => {
      const est = live ? calculateEstimatedPnL(row, live) : null
      return {
        type:          row.type ?? 'CONVICTION',
        shares:        row.shares,
        entry_price:   round(row.entryPrice, 2),
        days_held:     est ? est.daysHeld : null,
        live_pnl_eur:  est ? round(est.estimatedNetEur, 0) : null,
      }
    }),
  }
}

async function getRecentNews() {
  const n = await fetchJson('/api/news')
  const articles = Array.isArray(n?.articles) ? n.articles.slice(0, 8) : []
  return {
    articles: articles.map(a => ({
      headline: a.headline,
      bucket:   a.bucket,
      age:      relativeAge(a.datetime),
    })),
  }
}

function getCountdowns() {
  return {
    days_to_earnings: daysUntil(EARNINGS_DATE),
    days_to_fomc:     daysUntil(FOMC_DATE),
  }
}

async function getTradingBrief() {
  const [price, macro, thesis, checklist, positions, news] = await Promise.all([
    getLivePrice(),
    getMacro(),
    getThesis(),
    getChecklist(),
    getPositions(),
    getRecentNews(),
  ])
  return {
    price,
    macro,
    thesis,
    checklist,
    positions,
    news,
    countdowns: getCountdowns(),
  }
}

/**
 * Main entrypoint. Returns a plain JSON-serialisable object, or
 * { error: string } if the toolName is unknown.
 *
 * userId is accepted for future per-user position lookups but is not
 * currently wired through — positions and iran status read the current
 * auth-gated endpoints which fall back to defaults when no session exists.
 */
export async function buildJarvisContext(toolName /* , userId */) {
  switch (toolName) {
    case 'get_live_price':      return await getLivePrice()
    case 'get_thesis_status':   return await getThesis()
    case 'get_macro':           return await getMacro()
    case 'get_buy_checklist':   return await getChecklist()
    case 'get_open_positions':  return await getPositions()
    case 'get_recent_news':     return await getRecentNews()
    case 'get_countdowns':      return getCountdowns()
    case 'get_trading_brief':   return await getTradingBrief()
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}
