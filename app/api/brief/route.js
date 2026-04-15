import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getBaseUrl, EARNINGS_DATE } from '@/lib/config'
import { daysUntil } from '@/lib/calculations'
import Anthropic from '@anthropic-ai/sdk'

function getETDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export async function GET() {
  const today = getETDate()
  let dawn = null, premarket = null, history = []

  try {
    const redis = getRedis()
    if (redis) {
      const [dawnRaw, premarketRaw, historyRaw] = await Promise.all([
        redis.get(`brief:dawn:${today}`),
        redis.get(`brief:premarket:${today}`),
        redis.lrange('brief:history', 0, 9),
      ])
      dawn      = safeParse(dawnRaw, null)
      premarket = safeParse(premarketRaw, null)
      history   = Array.isArray(historyRaw)
        ? historyRaw.map(item => safeParse(item, null)).filter(Boolean)
        : []
    }
  } catch (err) {
    console.error('[/api/brief GET]', err.message)
  }

  return Response.json({ dawn, premarket, history, today })
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { type } = body
  if (!['dawn', 'premarket', 'refresh'].includes(type)) {
    return Response.json({ error: 'Invalid type' }, { status: 400 })
  }

  try {
    const BASE = getBaseUrl()
    const [priceRes, macroRes, newsRes, fundamentalsRes, positionsRes] = await Promise.all([
      fetch(`${BASE}/api/price`),
      fetch(`${BASE}/api/macro`),
      fetch(`${BASE}/api/news`),
      fetch(`${BASE}/api/fundamentals`),
      fetch(`${BASE}/api/positions`),
    ])

    const [price, macro, newsData, fundamentals, positionsData] = await Promise.all([
      priceRes.json(),
      macroRes.json(),
      newsRes.json(),
      fundamentalsRes.json(),
      positionsRes.json(),
    ])

    // Compute streak from sparkline (consecutive closes in same direction)
    const sparkline = price.sparkline ?? []
    let streak = 0
    let streakDir = null
    if (sparkline.length > 1) {
      const lastUp = sparkline[sparkline.length - 1] > sparkline[sparkline.length - 2]
      streakDir = lastUp ? 'up' : 'down'
      for (let i = sparkline.length - 1; i > 0; i--) {
        const thisUp = sparkline[i] > sparkline[i - 1]
        if (thisUp === lastUp) streak++
        else break
      }
    }

    // Build position summary string
    const positions = positionsData.positions || []
    const positionSummary = positions.length === 0
      ? 'No open positions'
      : positions.map(p => {
          const days = Math.floor((Date.now() - new Date(p.entryDate)) / 86400000)
          const grossPnl = ((price.price - p.entryPrice) * p.shares).toFixed(0)
          return `${p.type} ${p.shares} shares @ $${p.entryPrice} — held ${days}d — gross P&L $${grossPnl}`
        }).join(', ')

    // Format top 6 news articles by impact score
    const articles = newsData.articles || []
    const sortedNews = [...articles]
      .sort((a, b) => (b.score ?? b.stars ?? 0) - (a.score ?? a.stars ?? 0))
      .slice(0, 6)
    const newsLines = sortedNews.length === 0
      ? 'No recent news'
      : sortedNews.map(a => {
          const ageHours = a.datetime
            ? Math.round((Date.now() / 1000 - a.datetime) / 3600)
            : '?'
          const stars = a.stars > 0 ? '★'.repeat(a.stars) : ''
          return `[${a.bucket ?? '?'}]${stars} ${a.headline} (${ageHours}h ago)`
        }).join('\n')

    // Derived fundamentals
    const analystTarget  = fundamentals.analystTarget ?? 264
    const targetGapPct   = ((analystTarget - price.price) / price.price * 100).toFixed(1)
    const daysToEarnings = daysUntil(EARNINGS_DATE)

    const sign = n => (n == null ? '?' : (n >= 0 ? '+' : '') + Number(n).toFixed(2))

    const typeOpenings = {
      dawn:      'Generate a pre-dawn trading brief. It is 3:30am ET — 30 minutes before premarket opens.\nCover what happened overnight and what to expect for today\'s session.',
      premarket: 'Generate a pre-market trading brief. It is 9:00am ET — 30 minutes before market opens.\nCover what developed during premarket and refine the setup for today\'s session.',
      refresh:   'Generate an intraday trading brief. The market is currently open.\nFocus on current conditions and whether any action is needed on open positions.',
    }

    const userMessage = `${typeOpenings[type]}

CURRENT DATA:
NVDA Price: $${Number(price.price).toFixed(2)} (${sign(price.pctChange)}% vs prev close)
200 SMA distance: ${sign(price.pctFrom200)}%
50 SMA distance: ${sign(price.pctFrom50)}%
Volume ratio: ${price.volumeRatio != null ? Number(price.volumeRatio).toFixed(2) : '?'}x avg
Consecutive days ${streakDir ?? 'flat'}: ${streak}

OIL: $${macro.oil ? Number(macro.oil.price).toFixed(2) : '?'} (${macro.oil ? sign(macro.oil.pctChange) : '?'}% today)
QQQ: ${macro.qqq ? sign(macro.qqq.pctChange) : '?'}% today
VIX: ${macro.vix ? Number(macro.vix.level).toFixed(1) : '?'}

NEWS (scored by impact):
${newsLines}

OPEN POSITIONS:
${positionSummary}

ANALYST TARGET: $${analystTarget} (${targetGapPct}% above current)
DAYS TO EARNINGS: ${daysToEarnings}

Return this exact JSON:
{
  "type": "${type}",
  "oneLine": "<single sentence — the one thing he needs to know right now>",
  "setup": {
    "type": "SCALP" | "CONVICTION" | "NO SETUP" | "WAIT",
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "entryZone": "<$XXX-XXX or null>",
    "thesis": "<one sentence or null>",
    "invalidatedIf": "<one sentence or null>"
  },
  "positions": {
    "action": "HOLD" | "ADD" | "REDUCE" | "CLOSE" | "NONE",
    "reason": "<one sentence>",
    "interestWarning": true | false
  },
  "summary": "<2-3 sentences covering the key overnight or intraday developments>",
  "watchToday": [
    "<specific thing to watch with time if known>",
    "<specific thing>",
    "<specific thing>"
  ],
  "keyNews": [
    { "headline": "<headline>", "impact": "HIGH" | "MEDIUM", "alreadyPriced": true | false }
  ],
  "nvda": {
    "smaStatus": "<X.X% above/below 200 SMA>",
    "keyLevel": "<most important price level to watch today>"
  }
}`

    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are Jarvis, a trading assistant for a short-term mean-reversion trader.
He makes SCALP trades (0-48 hours) and CONVICTION trades (2-10 days).
He buys oversold conditions caused by news overreactions — not momentum.
He never enters after 5+ consecutive up days unless there is a fresh dip.
Focus only on the next 1-7 days. Ignore 12-month analyst targets.
Respond only in the JSON format specified. Be direct. Use real numbers.`,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Parse Claude response
    const raw   = message.content[0].text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned non-JSON response')

    let result
    try {
      result = JSON.parse(match[0])
    } catch {
      throw new Error('Claude JSON parse failed')
    }

    result.generatedAt = Date.now()

    // Store in Redis (non-fatal if unavailable)
    try {
      const redis = getRedis()
      if (redis) {
        const today = getETDate()
        if (type === 'dawn') {
          await redis.set(`brief:dawn:${today}`, JSON.stringify(result), { ex: 86400 })
        } else if (type === 'premarket') {
          await redis.set(`brief:premarket:${today}`, JSON.stringify(result), { ex: 86400 })
        }
        if (type !== 'refresh') {
          await redis.lpush('brief:history', JSON.stringify({ ...result, date: today }))
          await redis.ltrim('brief:history', 0, 9)
        }
      }
    } catch (err) {
      console.error('[/api/brief POST redis]', err.message)
    }

    return Response.json(result)
  } catch (err) {
    console.error('[/api/brief POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
