const FINNHUB = 'https://finnhub.io/api/v1'
const AV      = 'https://www.alphavantage.co/query'
const FH_KEY  = process.env.FINNHUB_API_KEY
const AV_KEY  = process.env.ALPHA_VANTAGE_API_KEY

// Server-side in-memory caches
// AV call budget: SMA200 (4/day) + SMA50 (4/day) + daily (4/day) + brent (4/day) + fundamentals (4/day) = ~20/day
let quoteCache  = { data: null, ts: 0 }
let sma200Cache = { data: null, ts: 0 }
let sma50Cache  = { data: null, ts: 0 }
let dailyCache  = { data: null, ts: 0 }

const QUOTE_TTL = 55_000       // 55 seconds — live price
const SMA_TTL   = 6 * 3600_000 // 6 hours — SMAs change slowly
const DAILY_TTL = 6 * 3600_000 // 6 hours — 100-day window for sparkline/volume/10d high

async function fetchQuote() {
  if (Date.now() - quoteCache.ts < QUOTE_TTL && quoteCache.data) return quoteCache.data
  const res  = await fetch(`${FINNHUB}/quote?symbol=NVDA&token=${FH_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  if (!data.c) throw new Error('Quote unavailable')
  quoteCache = { data, ts: Date.now() }
  return data
}

async function fetchSMA(period, cache, setCache) {
  if (Date.now() - cache.ts < SMA_TTL && cache.data) return cache.data
  const res  = await fetch(
    `${AV}?function=SMA&symbol=NVDA&interval=daily&time_period=${period}&series_type=close&apikey=${AV_KEY}`,
    { cache: 'no-store' }
  )
  const json = await res.json()
  const s    = json?.['Technical Analysis: SMA']
  if (!s) return null
  const latest = Object.values(s)[0]
  if (!latest) return null
  const val = parseFloat(latest.SMA)
  setCache({ data: val, ts: Date.now() })
  return val
}

/**
 * Alpha Vantage compact daily — last 100 trading days.
 * Provides: sparkline, 10-day high, 30-day avg volume.
 */
async function fetchDaily() {
  if (Date.now() - dailyCache.ts < DAILY_TTL && dailyCache.data) return dailyCache.data
  const res  = await fetch(
    `${AV}?function=TIME_SERIES_DAILY&symbol=NVDA&outputsize=compact&apikey=${AV_KEY}`,
    { cache: 'no-store' }
  )
  const json = await res.json()
  const series = json?.['Time Series (Daily)']
  if (!series) return null

  // Dates in descending order from AV — convert to arrays newest→oldest then reverse
  const dates  = Object.keys(series).sort((a, b) => b.localeCompare(a))
  const closes = dates.map(d => parseFloat(series[d]['4. close'])).reverse()
  const highs  = dates.map(d => parseFloat(series[d]['2. high'])).reverse()
  const vols   = dates.map(d => parseFloat(series[d]['5. volume'])).reverse()

  const data = { closes, highs, vols }
  dailyCache = { data, ts: Date.now() }
  return data
}

export async function GET() {
  try {
    // Start Finnhub quote immediately (doesn't count toward AV rate limit)
    const quotePromise = fetchQuote()

    // AV calls run sequentially to respect 1 req/sec burst limit.
    // With 6-hour caching, this only matters on cold start (once every 6hr).
    const sma200 = await fetchSMA(200, sma200Cache, (v) => { sma200Cache = v })
    const sma50  = await fetchSMA(50,  sma50Cache,  (v) => { sma50Cache  = v })
    const daily  = await fetchDaily()
    const quote  = await quotePromise

    const price = quote.c

    const highs = daily?.highs ?? []
    const vols  = daily?.vols  ?? []

    const tenDayHigh      = highs.length >= 10 ? Math.max(...highs.slice(-10))              : null
    const thirtyDayAvgVol = vols.length  >= 30 ? vols.slice(-30).reduce((a, b) => a + b, 0) / 30 : null

    // Sparkline: 59 historical closes + live price as final point
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
      lastUpdated:    Date.now(),
    })
  } catch (err) {
    console.error('[/api/price]', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
