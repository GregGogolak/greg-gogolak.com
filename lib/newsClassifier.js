import Anthropic from '@anthropic-ai/sdk'

// Patterns → Bucket C (Thesis Risk). C takes absolute priority.
const BUCKET_C_PATTERNS = [
  /export\s+(restrict|ban|control|limit|block)/i,
  /(H100|H200|Blackwell).{0,40}(ban|restrict|block|limit|prohibit)/i,
  /(ban|restrict|block|limit|prohibit).{0,40}(H100|H200|Blackwell)/i,
  // capex cut: keyword before OR after capex, with data-center/AI/cloud context
  /hyperscaler.{0,60}capex.{0,60}(cut|reduc|slow|declin|fall|drop)/i,
  /(cut|reduc|slow|declin|fall|drop).{0,60}capex.{0,60}(AI|data.?cent|cloud|hyperscaler)/i,
  /AI\s+spending.{0,30}(slow|declin|cut|reduc|fall|drop)/i,
  /antitrust.{0,60}(nvidia|NVDA)/i,
  /(nvidia|NVDA).{0,60}antitrust/i,
]

// Patterns → Bucket B (Thesis Support)
const BUCKET_B_PATTERNS = [
  /hyperscaler.{0,60}capex.{0,60}(increas|grow|boost|expand|rise|hike|rais)/i,
  // capex increase: action before or after capex, with AI/data-center/cloud context
  /(increas|grow|boost|expand|rais|hike).{0,60}capex.{0,60}(AI|data.?cent|cloud|hyperscaler)/i,
  /capex.{0,60}(increas|grow|boost|expand|rise|hike).{0,60}(AI|data.?cent|cloud|hyperscaler)/i,
  /Jensen\s+Huang/i,
  /earnings.{0,30}(beat|exceed|surpass|top\s+estimate)/i,
  // analyst upgrade: "raises" can come before "price target"
  /analyst.{0,30}(upgrad|rais.{0,10}target|increas.{0,10}target)/i,
  /(rais|increas|upgrad|bump).{0,30}price\s+target/i,
  /price\s+target.{0,20}(rais|increas|upgrad|bump)/i,
  /(contract|deal)\s+(win|won|secure|award)/i,
  /(win|won|secure|award).{0,20}(contract|deal)/i,
  /Blackwell.{0,40}(launch|announc|ship|deliver|deploy|ramp)/i,
]

// Patterns → Bucket A (definite Noise)
const BUCKET_A_PATTERNS = [
  /sector\s+rotation/i,
  /options\s+flow/i,
  /short\s+interest/i,
  /technical\s+(analysis|breakdown|breakout|setup)/i,
  // Generic bullish/bearish AI sector commentary with no specific catalyst
  /analysts?\s+(remain|are|stay|continue).{0,20}bullish.{0,40}AI\s+sector/i,
  /bullish\s+on\s+AI\s+sector/i,
]

/**
 * Keyword-only classification. No API calls. Returns 'A', 'B', 'C', or null.
 * null = ambiguous — send to Claude only inside /api/analysis.
 * On the dashboard (/api/news), null is treated as 'A'.
 *
 * @param {string} text - headline + summary concatenated
 * @returns {'A' | 'B' | 'C' | null}
 */
export function classifyWithKeywords(text) {
  if (!text) return null

  const hasC = BUCKET_C_PATTERNS.some(p => p.test(text))
  const hasB = BUCKET_B_PATTERNS.some(p => p.test(text))

  // C always wins — never miss a risk signal
  if (hasC) return 'C'
  if (hasB) return 'B'

  const hasA = BUCKET_A_PATTERNS.some(p => p.test(text))
  if (hasA) return 'A'

  // No confident match — caller decides (null → Claude in /api/analysis)
  return null
}

/**
 * Claude classifies a batch of ambiguous articles.
 * Called only from /api/analysis — never from /api/news.
 *
 * @param {Array<{headline: string, summary?: string}>} articles
 * @returns {Promise<Array<{...article, bucket: 'A'|'B'|'C', bucketReason: string}>>}
 */
export async function classifyWithClaude(articles) {
  if (!articles.length) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const articleList = articles
    .map((a, i) => `[${i}] ${a.headline}${a.summary ? ' — ' + a.summary.slice(0, 120) : ''}`)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Classify each NVDA news article. Reply with a JSON array only — no prose.

Bucket A = Noise: general AI commentary, minor analyst tweaks, sector rotation, options flow, small price target changes (<5%)
Bucket B = Thesis Support: hyperscaler capex increases, data centre AI investment, Jensen Huang positive comments, NVDA product launches, earnings beats, significant analyst upgrades
Bucket C = Thesis Risk: export restrictions on H100/H200/Blackwell, hyperscaler capex cuts, AI spending slowdowns, customer loss, antitrust, competing chip threats

Articles:
${articleList}

Reply format (same order as input):
[{"bucket":"A","reason":"brief reason"},{"bucket":"B","reason":"..."}]
The bucket field must be exactly the single character A, B, or C — nothing else.`,
    }],
  })

  const raw = response.content[0].text.trim()
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) return articles.map(a => ({ ...a, bucket: 'A', bucketReason: 'classification failed' }))

  let classifications
  try {
    classifications = JSON.parse(match[0])
  } catch {
    return articles.map(a => ({ ...a, bucket: 'A', bucketReason: 'parse failed' }))
  }
  const validBuckets = new Set(['A', 'B', 'C'])
  return articles.map((article, i) => {
    const raw = (classifications[i]?.bucket ?? '').toUpperCase().replace(/[^ABC]/g, '')[0]
    const bucket = validBuckets.has(raw) ? raw : 'A'
    return { ...article, bucket, bucketReason: classifications[i]?.reason ?? '' }
  })
}
