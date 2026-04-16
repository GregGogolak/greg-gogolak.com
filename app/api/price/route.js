import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

const FINNHUB = 'https://finnhub.io/api/v1'
const TD      = 'https://api.twelvedata.com'
const FH_KEY  = process.env.FINNHUB_API_KEY
const TD_KEY  = process.env.TWELVE_DATA_API_KEY

// L1: server-side in-memory caches (warm instances only)
let quoteCache        = { data: null, ts: 0 }
let sma200Cache       = { data: null, ts: 0 }
let sma50Cache        = { data: null, ts: 0 }
let dailyCache        = { data: null, ts: 0 }
let marketStatusCache = { data: null, ts: 0 }

const QUOTE_TTL         = 55_000         // 55 seconds — live price
const MARKET_STATUS_TTL = 3_600_000      // 1 hour
const SMA_TTL           = 6 * 3600_000   // 6 hours — SMAs change slowly
const DAILY_TTL         = 6 * 3600_000   // 6 hours — 100-day window
const SMA_TTL_S         = 6 * 3600       // Redis TTL in seconds
const DAILY_TTL_S       = 6 * 3600

async function fetchQuote() {
  if (Date.now() - quoteCache.ts < QUOTE_TTL && quoteCache.data) return quoteCache.data
  const res  = await fetch(`${FINNHUB}/quote?symbol=NVDA&token=${FH_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  if (!data.c) throw new Error('Quote unavailable')
  quoteCache = { data, ts: Date.now() }
  return data
}

async function fetchSMA(period, cache, setCache) {
  // L1: in-memory
  if (Date.now() - cache.ts < SMA_TTL && cache.data) return cache.data

  // L2: Redis — shared across all Vercel instances
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(`price:sma${period}`)
      if (cached != null) {
        const val = Number(cached)
        setCache({ data: val, ts: Date.now() })
        return val
      }
    } catch {}
  }

  // Fetch from Twelve Data
  try {
    const res  = await fetch(
      `${TD}/sma?symbol=NVDA&interval=1day&time_period=${period}&outputsize=2&apikey=${TD_KEY}`,
      { cache: 'no-store' }
    )
    const json = await res.json()
    if (json?.status === 'error') {
      console.error(`[fetchSMA ${period}] TD error:`, json.code, json.message)
      return null
    }
    const val = parseFloat(json?.values?.[0]?.sma)
    if (!val || isNaN(val)) return null
    if (redis) {
      try { await redis.set(`price:sma${period}`, val, { ex: SMA_TTL_S }) } catch {}
    }
    setCache({ data: val, ts: Date.now() })
    return val
  } catch {
    return null
  }
}

/**
 * Twelve Data time_series daily — last 100 trading days.
 * Provides: sparkline, 10-day high, 30-day avg volume.
 */
async function fetchDaily() {
  // L1: in-memory
  if (Date.now() - dailyCache.ts < DAILY_TTL && dailyCache.data) return dailyCache.data

  // L2: Redis
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get('price:daily')
      if (cached != null) {
        const data = safeParse(cached, null)
        if (data) {
          dailyCache = { data, ts: Date.now() }
          return data
        }
      }
    } catch {}
  }

  // Fetch from Twelve Data
  try {
    const res  = await fetch(
      `${TD}/time_series?symbol=NVDA&interval=1day&outputsize=100&apikey=${TD_KEY}`,
      { cache: 'no-store' }
    )
    const json = await res.json()
    if (json?.status === 'error') {
      console.error('[fetchDaily] TD error:', json.code, json.message)
      return null
    }
    const values = json?.values
    if (!Array.isArray(values) || values.length === 0) return null

    // Twelve Data returns newest-first — reverse to oldest→newest for slice(-N) calcs
    const reversed = [...values].reverse()
    const closes = reversed.map(d => parseFloat(d.close))
    const highs  = reversed.map(d => parseFloat(d.high))
    const vols   = reversed.map(d => parseFloat(d.volume))

    const data = { closes, highs, vols }
    if (redis) {
      try { await redis.set('price:daily', JSON.stringify(data), { ex: DAILY_TTL_S }) } catch {}
    }
    dailyCache = { data, ts: Date.now() }
    return data
  } catch {
    return null
  }
}

async function fetchRSI() {
  try {
    const rsiUrl = `${FINNHUB}/indicator?symbol=NVDA&resolution=15&indicator=rsi&timeperiod=14&token=${FH_KEY}`
    const res    = await fetch(rsiUrl, { cache: 'no-store' })
    const json   = await res.json()
    const values = json?.rsi ?? []
    return values.length > 0 ? values[values.length - 1] : null
  } catch {
    return null
  }
}

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

export async function GET() {
  try {
    // Start Finnhub calls immediately (don't count toward AV rate limit)
    const quotePromise        = fetchQuote()
    const marketStatusPromise = fetchMarketStatus()
    const rsiPromise          = fetchRSI()

    // TD calls run sequentially with a 1s gap to stay within the 8 credits/min rate limit.
    // With 6-hour caching, this only fires on cold start (once every 6hr).
    const sma200 = await fetchSMA(200, sma200Cache, (v) => { sma200Cache = v })
    await new Promise(r => setTimeout(r, 1100))
    const sma50  = await fetchSMA(50,  sma50Cache,  (v) => { sma50Cache  = v })
    await new Promise(r => setTimeout(r, 1100))
    const daily  = await fetchDaily()
    const quote  = await quotePromise
    const marketOpen = await marketStatusPromise
    const rsi    = await rsiPromise

    const price = quote.c

    const highs = daily?.highs ?? []
    const vols  = daily?.vols  ?? []

    const tenDayHigh      = highs.length >= 10 ? Math.max(...highs.slice(-10))              : null
    const thirtyDayAvgVol = vols.length  >= 30 ? vols.slice(-30).reduce((a, b) => a + b, 0) / 30 : null

    // Sparklines at different timeframes (closes + live price as final point)
    const sparkline    = daily ? [...daily.closes.slice(-59), price] : [price]
    const sparkline7d  = daily ? [...daily.closes.slice(-4),  price] : [price]  // ~1 week (5 trading days)
    const sparkline30d = daily ? [...daily.closes.slice(-21), price] : [price]  // ~1 month (22 trading days)

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
      sparkline7d,
      sparkline30d,
      marketOpen,
      rsi,
      lastUpdated:    Date.now(),
    })
  } catch (err) {
    console.error('[/api/price]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
