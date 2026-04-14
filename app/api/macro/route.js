const FINNHUB = 'https://finnhub.io/api/v1'
const AV      = 'https://www.alphavantage.co/query'
const FH_KEY  = process.env.FINNHUB_API_KEY
const AV_KEY  = process.env.ALPHA_VANTAGE_API_KEY

let cache = { data: null, ts: 0 }
const TTL = 4 * 60_000  // 4 minutes

async function fetchQuote(symbol) {
  const res = await fetch(`${FINNHUB}/quote?symbol=${symbol}&token=${FH_KEY}`, { cache: 'no-store' })
  return res.json()
}

async function fetchVixFallback() {
  // Alpha Vantage GLOBAL_QUOTE for ^VIX
  const res  = await fetch(`${AV}?function=GLOBAL_QUOTE&symbol=%5EVIX&apikey=${AV_KEY}`, { cache: 'no-store' })
  const data = await res.json()
  const q    = data['Global Quote']
  if (!q || !q['05. price']) return null
  return {
    level:     parseFloat(q['05. price']),
    pctChange: parseFloat(q['10. change percent']),
    source:    'alpha_vantage',
  }
}

async function fetchBrentCandles() {
  // 5 calendar days of Brent candles for 2-session oil change
  const to   = Math.floor(Date.now() / 1000)
  const from = to - 8 * 24 * 60 * 60
  const res  = await fetch(
    `${FINNHUB}/stock/candle?symbol=OANDA:BCO_USD&resolution=D&from=${from}&to=${to}&token=${FH_KEY}`,
    { cache: 'no-store' }
  )
  return res.json()
}

export async function GET() {
  if (Date.now() - cache.ts < TTL && cache.data) return Response.json(cache.data)

  try {
    const [oilQuote, qqqQuote, vixQuote, brentCandles] = await Promise.all([
      fetchQuote('OANDA:BCO_USD'),
      fetchQuote('QQQ'),
      fetchQuote('CBOE:VIX'),
      fetchBrentCandles(),
    ])

    // Oil 2-session change for AT RISK thesis check
    let oilTwoSessionPct = 0
    if (brentCandles?.s === 'ok' && brentCandles.c?.length >= 3) {
      const c = brentCandles.c
      oilTwoSessionPct = ((c[c.length - 1] - c[c.length - 3]) / c[c.length - 3]) * 100
    }

    // VIX — Finnhub first, Alpha Vantage fallback
    let vix = null
    if (vixQuote?.c && vixQuote.c > 0) {
      vix = { level: vixQuote.c, pctChange: vixQuote.dp, source: 'finnhub' }
    } else {
      vix = await fetchVixFallback()
    }

    // Brent — Finnhub first, or graceful null
    const oilAvailable = oilQuote?.c && oilQuote.c > 0
    const oil = oilAvailable
      ? { price: oilQuote.c, pctChange: oilQuote.dp, twoSessionPct: oilTwoSessionPct }
      : null

    const result = {
      oil,
      qqq:        { pctChange: qqqQuote?.dp ?? null },
      vix,
      lastUpdated: Date.now(),
    }

    cache = { data: result, ts: Date.now() }
    return Response.json(result)
  } catch (err) {
    console.error('[/api/macro]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
