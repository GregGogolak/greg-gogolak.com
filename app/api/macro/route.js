import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

const FINNHUB  = 'https://finnhub.io/api/v1'
const FH_KEY   = process.env.FINNHUB_API_KEY

// L1: in-memory caches per data source
let cache       = { data: null, ts: 0 }  // combined response cache
let qqqCache    = { data: null, ts: 0 }
let brentCache  = { data: null, ts: 0 }
let vixCache    = { data: null, ts: 0 }

const MACRO_TTL   = 5  * 60_000  // 5 min  — QQQ quote, cheap Finnhub call
const BRENT_TTL   = 5  * 60_000  // 5 min  — Brent crude, oil moves fast
const VIX_TTL     = 10 * 60_000  // 10 min — VIX
const MACRO_TTL_S = 5  * 60      // Redis TTL in seconds
const BRENT_TTL_S = 5  * 60
const VIX_TTL_S   = 10 * 60

/**
 * QQQ via Finnhub (works on free tier)
 */
async function fetchQQQ() {
  // L1: in-memory
  if (Date.now() - qqqCache.ts < MACRO_TTL && qqqCache.data) return qqqCache.data

  // L2: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const parsed = safeParse(await redis.get('macro:qqq'))
      if (parsed && Date.now() - parsed.ts < MACRO_TTL) {
        qqqCache = { data: parsed.data, ts: Date.now() }
        return parsed.data
      }
    } catch {}
  }

  const res  = await fetch(`${FINNHUB}/quote?symbol=QQQ&token=${FH_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  if (!data?.c) return null

  if (redis) {
    try { await redis.set('macro:qqq', JSON.stringify({ data, ts: Date.now() }), { ex: MACRO_TTL_S }) } catch {}
  }
  qqqCache = { data, ts: Date.now() }
  return data
}

/**
 * Brent crude via Yahoo Finance (BZ=F futures contract).
 * OilPriceAPI free tier exhausted — Yahoo has no key requirement.
 * Same pattern as fetchVix() already in use.
 * Cached 5 min — oil moves fast.
 */
async function fetchBrent() {
  // L1: in-memory
  if (Date.now() - brentCache.ts < BRENT_TTL && brentCache.data) return brentCache.data

  // L2: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const parsed = safeParse(await redis.get('macro:brent'))
      if (parsed && Date.now() - parsed.ts < BRENT_TTL) {
        brentCache = { data: parsed.data, ts: Date.now() }
        return parsed.data
      }
    } catch {}
  }

  try {
    const res  = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BZ%3DF?interval=1d&range=5d',
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nvda-jarvis/1.0)' },
      }
    )
    const json   = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta      = result.meta
    const price     = meta.regularMarketPrice
    const prevClose = meta.previousClose ?? meta.chartPreviousClose
    if (!price) return null

    const pctChange = prevClose ? ((price - prevClose) / prevClose) * 100 : null

    const brent = {
      price,
      prevPrice:     prevClose ?? null,
      pctChange,
      twoSessionPct: null,
    }

    if (redis) {
      try { await redis.set('macro:brent', JSON.stringify({ data: brent, ts: Date.now() }), { ex: BRENT_TTL_S }) } catch {}
    }
    brentCache = { data: brent, ts: Date.now() }
    return brent
  } catch {
    return null
  }
}

/**
 * VIX via Yahoo Finance chart API.
 * Twelve Data does not carry the CBOE VIX index on its free tier (returns 404).
 * Yahoo Finance has no key requirement and returns reliable data.
 * 10-minute cache.
 */
async function fetchVix() {
  // L1: in-memory
  if (Date.now() - vixCache.ts < VIX_TTL && vixCache.data) return vixCache.data

  // L2: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const parsed = safeParse(await redis.get('macro:vix'))
      if (parsed && Date.now() - parsed.ts < VIX_TTL) {
        vixCache = { data: parsed.data, ts: Date.now() }
        return parsed.data
      }
    } catch {}
  }

  try {
    const res  = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d',
      {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; nvda-jarvis/1.0)' },
      }
    )
    const json   = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) return null

    const meta      = result.meta
    const price     = meta.regularMarketPrice
    const prevClose = meta.previousClose ?? meta.chartPreviousClose
    if (!price) return null

    const vix = {
      level:     price,
      pctChange: prevClose ? ((price - prevClose) / prevClose) * 100 : null,
      source:    'yahoo',
    }

    if (redis) {
      try { await redis.set('macro:vix', JSON.stringify({ data: vix, ts: Date.now() }), { ex: VIX_TTL_S }) } catch {}
    }
    vixCache = { data: vix, ts: Date.now() }
    return vix
  } catch {
    return null
  }
}

export async function GET() {
  if (Date.now() - cache.ts < MACRO_TTL && cache.data) return Response.json(cache.data)

  try {
    const [qqq, brent, vix] = await Promise.all([fetchQQQ(), fetchBrent(), fetchVix()])

    const result = {
      oil: brent
        ? { price: brent.price, pctChange: brent.pctChange, twoSessionPct: brent.twoSessionPct }
        : null,
      qqq:         { pctChange: qqq?.dp ?? null },
      vix:         vix ?? null,
      lastUpdated: Date.now(),
    }

    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[/api/macro]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
