import Anthropic from '@anthropic-ai/sdk'
import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'

export async function GET() {
  const redis = getRedis()
  const cacheKey = 'calendar:events'

  try {
    const cached = await redis.get(cacheKey)
    const parsed = safeParse(cached)
    if (parsed) return Response.json(parsed)
  } catch {}

  const client = new Anthropic()
  const today = new Date().toISOString().split('T')[0]

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Today is ${today}. You are a trading assistant for an NVDA swing trader.

Generate a JSON array of upcoming events that are relevant to NVDA price action. Include known scheduled events (NVDA earnings May 20 2026, FOMC April 28-29 2026) and any relevant macro events you know about. Order by date ascending. Maximum 6 events.

Return ONLY a JSON array, no other text:
[
  {
    "title": "event name",
    "date": "YYYY-MM-DD",
    "daysAway": number,
    "type": "earnings|fomc|macro|geopolitical",
    "impact": "high|medium|low",
    "note": "one sentence why this matters for NVDA"
  }
]`,
    }],
  })

  const text = message.content[0].text
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const events = JSON.parse(clean)
    await redis.set(cacheKey, JSON.stringify({ events, updatedAt: new Date().toISOString() }), { ex: 3600 })
    return Response.json({ events, updatedAt: new Date().toISOString() })
  } catch {
    return Response.json({ events: [], updatedAt: new Date().toISOString() })
  }
}

export async function POST() {
  const redis = getRedis()
  await redis.del('calendar:events')
  return GET()
}
