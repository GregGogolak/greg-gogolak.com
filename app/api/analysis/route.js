import { getRedis } from '@/lib/redis'
import Anthropic from '@anthropic-ai/sdk'
import { classifyWithClaude } from '@/lib/newsClassifier'
import { formatBrief } from '@/lib/formatBrief'
import { daysUntil } from '@/lib/calculations'
import { EARNINGS_DATE, FOMC_DATE, getBaseUrl } from '@/lib/config'

const CACHE_KEY    = 'analysis:latest'
const CACHE_TTL_MS = 30 * 60 * 1000   // 30 minutes
const CACHE_TTL_S  = 30 * 60          // 30 minutes in seconds (for Redis ex)

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

// POST — on-demand analysis (returns cache if < 30 min old)
export async function POST() {
  try {
    const redis = getRedis()

    // Return cache if still fresh
    if (redis) {
      const cached = await redis.get(CACHE_KEY)
      if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
        return Response.json({ ...cached, fromCache: true })
      }
    }

    // Fetch all live data in parallel
    const baseUrl = getBaseUrl()
    const [priceRes, macroRes, newsRes, fundamentalsRes, positionsRes] = await Promise.all([
      fetch(`${baseUrl}/api/price`),
      fetch(`${baseUrl}/api/macro`),
      fetch(`${baseUrl}/api/news`),
      fetch(`${baseUrl}/api/fundamentals`),
      fetch(`${baseUrl}/api/positions`),
    ])

    for (const [res, name] of [
      [priceRes, 'price'], [macroRes, 'macro'], [newsRes, 'news'],
      [fundamentalsRes, 'fundamentals'], [positionsRes, 'positions'],
    ]) {
      if (!res.ok) throw new Error(`Upstream fetch failed: ${name} (${res.status})`)
    }

    const [price, macro, newsData, fundamentals, positionsData] = await Promise.all([
      priceRes.json(),
      macroRes.json(),
      newsRes.json(),
      fundamentalsRes.json(),
      positionsRes.json(),
    ])

    // /api/news already ran keyword classification — bucket is set or null (ambiguous).
    // Only send the null-bucket articles to Claude; don't re-classify what keywords resolved.
    const articles  = newsData.articles || []
    const definite  = articles.filter(a => a.bucket !== null && a.bucket !== undefined)
    const ambiguous = articles.filter(a => a.bucket === null || a.bucket === undefined)

    const claudeClassified = ambiguous.length > 0
      ? await classifyWithClaude(ambiguous)
      : []

    const classifiedNews = [...definite, ...claudeClassified]

    // Compute derived fundamentals values
    const analystTarget = fundamentals.analystTarget ?? 264
    const targetGapPct  = ((analystTarget - price.price) / price.price) * 100
    const daysToEarnings = daysUntil(EARNINGS_DATE)
    const daysToFomc     = daysUntil(FOMC_DATE)

    // Compute consecutive up days from sparkline for trader profile
    const sparkline = price.sparkline ?? []
    let daysUp = 0
    for (let i = sparkline.length - 1; i > 0; i--) {
      if (sparkline[i] > sparkline[i - 1]) daysUp++
      else break
    }
    const streakText = daysUp > 0
      ? `${daysUp} consecutive up day${daysUp !== 1 ? 's' : ''}`
      : 'flat or down (no consecutive up streak)'

    // Format the brief for Claude
    const brief = formatBrief({
      price,
      macro,
      news: classifiedNews,
      positions:    positionsData.positions || [],
      fundamentals: { analystTarget, targetGapPct, daysToEarnings, daysToFomc },
    })

    // Single Claude call — all outputs at once
    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1500,
      system: `You are Jarvis, a trading assistant for a short-term mean-reversion trader.
He makes two types of trades only:
- SCALP: 0-48 hours, buys technical dips when no major news is driving price
- CONVICTION: 2-10 days, buys when bad news has caused an overreaction and
  the situation is beginning to resolve

He does not hold positions for weeks or months. He does not care about
12-month analyst targets. He cares about what happens in the next 1-7 days.

Your job is to answer four specific questions for him:
1. Is there a trade setup right now — and if so, is it a scalp or conviction?
2. What is the specific reason price is where it is today?
3. Is that reason resolving, worsening, or stable — and how fast?
4. What is his entry thesis in one sentence and what would make it wrong?

Be direct. Be specific. Use actual numbers. Never give long-term outlooks.
Respond only in the JSON format specified.`,
      messages: [{
        role:    'user',
        content: `Based on this NVDA brief, return ONLY a JSON object with this exact shape:

{
  "setup": {
    "type": "SCALP" | "CONVICTION" | "NO SETUP" | "WAIT",
    "confidence": "HIGH" | "MEDIUM" | "LOW",
    "reason": "<one sentence — why this setup exists or why there is none>"
  },
  "whyHere": {
    "cause": "NEWS" | "TECHNICAL" | "MACRO" | "MIXED",
    "explanation": "<one sentence — specific cause of current price level>",
    "alreadyPriced": true | false
  },
  "resolution": {
    "direction": "RESOLVING" | "WORSENING" | "STABLE" | "UNKNOWN",
    "speed": "TODAY" | "THIS WEEK" | "NEXT WEEK" | "UNCLEAR",
    "catalyst": "<specific upcoming event or condition that resolves this, with date if known>"
  },
  "trade": {
    "thesis": "<one sentence entry thesis if setup exists, null if no setup>",
    "invalidatedIf": "<one sentence — what would make this wrong>",
    "entryZone": "<price range where entry makes sense, e.g. $181-184, or null>",
    "type": "SCALP" | "CONVICTION" | null
  },
  "newsToday": {
    "highImpact": ["<headline>"],
    "alreadyPriced": ["<headline>"],
    "ignore": "<count of noise articles ignored>"
  }
}

BRIEF:
${brief}

TRADER PROFILE:
- Mean-reversion trader. Buys oversold conditions, not momentum.
- SCALP trigger: technical dip with no major news driving it, expects $2-5 recovery
- CONVICTION trigger: bad news caused overreaction, news is beginning to resolve,
  price below fair value for the new reality
- Does NOT enter after 5+ consecutive up days unless there is a fresh dip
- Does NOT chase momentum
- Current streak: ${streakText}
- His question is always: "Has the bad news fully resolved or is there still
  a discount available?"`,
      }],
    })

    // Parse Claude's response
    const raw   = message.content[0].text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned non-JSON response')

    let analysis
    try {
      analysis = JSON.parse(match[0])
    } catch {
      throw new Error('Claude JSON parse failed')
    }

    const result = {
      ...analysis,
      classifiedNews,
      generatedAt: Date.now(),
      fromCache:   false,
    }

    // Cache in Redis (without fromCache flag)
    if (redis) {
      const { fromCache: _fc, ...toCache } = result
      await redis.set(CACHE_KEY, toCache, { ex: CACHE_TTL_S })
      await redis.lpush('analysis:history', toCache)
      await redis.ltrim('analysis:history', 0, 4)
    }

    return Response.json(result)
  } catch (err) {
    console.error('[/api/analysis]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
