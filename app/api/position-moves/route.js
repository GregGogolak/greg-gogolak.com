import Anthropic from '@anthropic-ai/sdk'
import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId } from '@/lib/auth'

const CACHE_KEY = userId => `position-moves:${userId}`

export async function GET() {
  try {
    const userId = await getUserId()
    const redis = getRedis()
    const raw = await redis.get(CACHE_KEY(userId))
    const data = safeParse(raw, null)
    return Response.json(data ?? { moves: [], generatedAt: null })
  } catch (err) {
    console.error('[/api/position-moves GET]', err)
    return Response.json({ moves: [], generatedAt: null })
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId()
    const redis = getRedis()

    const {
      positions,
      livePrice,
      sma200,
      sma50,
      rsi,
      vix,
      qqq,
      oilPct,
      thesis,
      bucketBCount,
      bucketCCount,
    } = await request.json()

    if (!positions || positions.length === 0) {
      return Response.json({ error: 'No positions provided' }, { status: 400 })
    }

    const now = new Date()
    const etTime = now.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    })

    const positionSummary = positions.map(p => {
      const days = Math.floor((Date.now() - new Date(p.entryDate).getTime()) / 86400000)
      const estGross = livePrice ? (livePrice - p.entryPrice) * p.shares : null
      return `- ${p.shares.toLocaleString()} shares @ $${p.entryPrice} (${p.type}, ${days}d held)${estGross !== null ? `, est. gross: ${estGross >= 0 ? '+' : ''}$${Math.round(estGross)}` : ''}`
    }).join('\n')

    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a trading advisor for NVDA positions. Analyse each open position and give a HOLD or SELL recommendation.

CURRENT CONDITIONS:
- NVDA live price: $${livePrice ?? 'unknown'}
- 200 SMA: $${sma200 ?? 'unknown'}
- 50 SMA: $${sma50 ?? 'unknown'}
- RSI (15m): ${rsi ?? 'unknown'}
- VIX: ${vix ?? 'unknown'}
- QQQ today: ${qqq != null ? `${qqq >= 0 ? '+' : ''}${qqq.toFixed(2)}%` : 'unknown'}
- Brent crude change: ${oilPct != null ? `${oilPct >= 0 ? '+' : ''}${oilPct.toFixed(2)}%` : 'unknown'}
- Thesis status: ${thesis ?? 'unknown'}
- Supporting news (Bucket B): ${bucketBCount ?? 0} articles
- Risk news (Bucket C): ${bucketCCount ?? 0} articles

OPEN POSITIONS:
${positionSummary}

For each position give exactly:
HOLD or SELL — one sentence reason (max 12 words)

Rules:
- CONVICTION positions: higher bar to sell, only sell on thesis break or severe macro
- SCALP positions: tighter — sell if momentum gone, VIX high, or past peak
- Be direct, no hedging, one clear recommendation per position
- If multiple positions, number them matching the order given

Return ONLY valid JSON, no markdown:
{
  "moves": [
    {
      "shares": number,
      "entryPrice": number,
      "type": "CONVICTION" or "SCALP",
      "action": "HOLD" or "SELL",
      "reason": "one sentence reason"
    }
  ]
}`,
      }],
    })

    const text = message.content[0].text
    let clean = text.replace(/```json|```/g, '').trim()
    if (!clean.startsWith('{')) {
      const start = clean.indexOf('{')
      const end = clean.lastIndexOf('}')
      if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)
    }

    const parsed = JSON.parse(clean)
    const result = {
      moves: parsed.moves ?? [],
      generatedAt: now.toISOString(),
      generatedAtET: etTime,
      priceAtGeneration: livePrice,
    }

    await redis.set(CACHE_KEY(userId), JSON.stringify(result))
    return Response.json(result)

  } catch (err) {
    console.error('[/api/position-moves POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
