import Anthropic from '@anthropic-ai/sdk'
import { getBuyChecklist, getThesisStatus } from '@/lib/thesisEngine'
import { daysUntil } from '@/lib/calculations'

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export async function POST(request) {
  try {
    const body = await request.json()
    const { entryPrice, targetPrice, shares, type } = body

    // Validate inputs
    if (!entryPrice || !targetPrice || !shares || !type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const ep = Number(entryPrice)
    const tp = Number(targetPrice)
    const sh = Number(shares)
    if (isNaN(ep) || isNaN(tp) || isNaN(sh) || sh < 1 || sh > 5000) {
      return Response.json({ error: 'Invalid trade parameters' }, { status: 400 })
    }
    if (!['CONVICTION', 'SCALP'].includes(type)) {
      return Response.json({ error: 'type must be CONVICTION or SCALP' }, { status: 400 })
    }

    // Fetch live market context in parallel
    const [priceRes, macroRes, newsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/price`),
      fetch(`${BASE_URL}/api/macro`),
      fetch(`${BASE_URL}/api/news`),
    ])

    const [price, macro, newsData] = await Promise.all([
      priceRes.json(),
      macroRes.json(),
      newsRes.json(),
    ])

    // Compute checklist from live data
    const articles       = newsData.articles || []
    const nowSec         = Date.now() / 1000
    const hasBucketCNews = articles.some(a => a.bucket === 'C' && (nowSec - a.datetime) < 86400)
    const daysToEarnings = daysUntil('2026-05-20')

    const checklist = getBuyChecklist({
      price:          price.price,
      sma200:         price.sma200,
      analystTarget:  264,
      hasBucketCNews,
      qqqPctChange:   macro.qqq?.pctChange ?? 0,
      vix:            macro.vix?.level ?? 0,
      daysToEarnings,
    })
    const passCount  = checklist.filter(c => c.pass).length
    const thesis     = getThesisStatus({
      price:            price.price,
      sma200:           price.sma200,
      oilTwoSessionPct: macro.oil?.twoSessionPct ?? 0,
      vix:              macro.vix?.level ?? 0,
      hasBucketCNews,
    })

    const sma200Pct = price.sma200
      ? (((price.price - price.sma200) / price.sma200) * 100).toFixed(1)
      : 'n/a'
    const gainPct   = (((tp - ep) / ep) * 100).toFixed(1)

    const prompt = `Evaluate this NVDA pre-trade setup. Return JSON only — no markdown, no prose:
{
  "thesis": "<one sentence — why this entry makes sense given current conditions>",
  "wrongCondition": "<one sentence — the single most likely event that would break this trade>",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}

TRADE: ${type} — ${sh} shares at $${ep.toFixed(2)} → $${tp.toFixed(2)} (+${gainPct}%)
CONDITIONS: ${passCount}/6 checklist items passing — thesis ${thesis.status}
CONTEXT: Price $${price.price?.toFixed(2)}, SMA200 ${sma200Pct}%, VIX ${macro.vix?.level?.toFixed(1) ?? 'n/a'}, QQQ ${macro.qqq?.pctChange >= 0 ? '+' : ''}${macro.qqq?.pctChange?.toFixed(2) ?? 'n/a'}%, ${hasBucketCNews ? 'Bucket C news ACTIVE' : 'no Bucket C news'}, ${daysToEarnings}d to earnings`

    const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 256,
      system:     'You are Jarvis, a concise NVDA trading analyst. Respond with valid JSON only — no markdown, no prose outside the JSON object.',
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw   = message.content[0].text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Claude returned non-JSON response')

    const result = JSON.parse(match[0])

    // Normalise confidence value
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(result.confidence)) {
      result.confidence = passCount >= 5 ? 'HIGH' : passCount >= 3 ? 'MEDIUM' : 'LOW'
    }

    return Response.json(result)
  } catch (err) {
    console.error('[/api/checklist]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
