import { sma } from '@/lib/calculations'

const FINNHUB = 'https://finnhub.io/api/v1'
const KEY     = process.env.FINNHUB_API_KEY

// Server-side in-memory caches
let quoteCache   = { data: null, ts: 0 }
let candleCache  = { data: null, ts: 0 }
const QUOTE_TTL  = 55_000        // 55 seconds
const CANDLE_TTL = 4 * 60_000   // 4 minutes

async function fetchQuote() {
  if (Date.now() - quoteCache.ts < QUOTE_TTL && quoteCache.data) return quoteCache.data
  const res  = await fetch(`${FINNHUB}/quote?symbol=NVDA&token=${KEY}`, { cache: 'no-store' })
  const data = await res.json()
  quoteCache = { data, ts: Date.now() }
  return data
}

async function fetchCandles() {
  if (Date.now() - candleCache.ts < CANDLE_TTL && candleCache.data) return candleCache.data
  const to   = Math.floor(Date.now() / 1000)
  const from = to - 320 * 24 * 60 * 60   // 320 calendar days → ~220 trading days
  const res  = await fetch(
    `${FINNHUB}/stock/candle?symbol=NVDA&resolution=D&from=${from}&to=${to}&token=${KEY}`,
    { cache: 'no-store' }
  )
  const data = await res.json()
  if (data.s !== 'ok') throw new Error('Candle fetch failed: ' + JSON.stringify(data))
  candleCache = { data, ts: Date.now() }
  return data
}

export async function GET() {
  try {
    const [quote, candles] = await Promise.all([fetchQuote(), fetchCandles()])

    const closes = candles.c
    const highs  = candles.h
    const vols   = candles.v

    const sma200 = sma(closes, 200)
    const sma50  = sma(closes, 50)
    const price  = quote.c

    const tenDayHigh      = highs.length >= 10 ? Math.max(...highs.slice(-10)) : null
    const thirtyDayAvgVol = vols.length >= 30  ? vols.slice(-30).reduce((a, b) => a + b, 0) / 30 : null

    // Last 60 closing prices for the sparkline chart
    const sparkline = closes.slice(-60)

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
    console.error('[/api/price]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
