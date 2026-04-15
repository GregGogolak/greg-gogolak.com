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
        await redis.lpush('analysis:history', cached)
        await redis.ltrim('analysis:history', 0, 4)
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

    // Format the brief for Claude
    const brief = formatBrief({
      price,
      macro,
      news: classifiedNews,
      positions:    positionsData.positions || [],
      fundamentals: { analystTarget, targetGapPct, daysToEarnings, daysToFomc },
    })

    // Single Claude call — all 6 outputs at once
    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     'You are Jarvis, a concise NVDA trading analyst. Respond with valid JSON only — no markdown, no prose outside the JSON object.',
      messages: [{
        role:    'user',
        content: `Based on this NVDA brief, return ONLY a JSON object with this exact shape:

{
  "undervalued": { "answer": "Yes" or "No", "reason": "<one sentence>" },
  "whyAtThisLevel": "<one sentence>",
  "whatResolvesIt": ["<item, include date if applicable>", ...],
  "recommendedAction": { "action": "BUY" or "WAIT" or "HOLD" or "AVOID", "reason": "<one sentence>" },
  "marketPulse": {
    "retail": { "label": "<2-3 word mood>", "summary": "<one sentence>" },
    "hedge":  { "label": "<2-3 word mood>", "summary": "<one sentence>" }
  }
}

BRIEF:
${brief}`,
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
