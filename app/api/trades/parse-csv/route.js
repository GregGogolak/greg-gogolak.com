import Anthropic from '@anthropic-ai/sdk'
import { getUserId } from '@/lib/auth'
import { calculateTrade } from '@/lib/tradeCalculations'

export async function POST(request) {
  try {
    await getUserId() // throws if unauthenticated

    const { csv } = await request.json()
    if (!csv) return Response.json({ error: 'No CSV provided' }, { status: 400 })

    const client = new Anthropic()

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role:    'user',
        content: `You are a trade data parser. Parse this CSV and return a JSON array of ALL trades found.

Parsing rules:
- Dates: convert to YYYY-MM-DD regardless of input format (handle "Friday 29/11/2024", "24/02/25", "02/03/26", any format)
- Numbers: clean floats — remove commas, currency symbols, quotes ("1,000" → 1000)
- Shares: positive number (remove commas)
- buy_price and sell_price: parse as-is — do NOT skip loss trades where sell_price < buy_price, these are valid
- Do NOT skip rows where buy_price equals sell_price — these are valid zero-profit trades
- Only skip a row if: dates are completely unparseable, OR prices are missing/zero/negative, OR shares are missing/zero

Return ONLY valid JSON, no markdown, no explanation:
{
  "trades": [
    {
      "buy_date": "YYYY-MM-DD",
      "sell_date": "YYYY-MM-DD",
      "buy_price": number,
      "sell_price": number,
      "shares": number
    }
  ],
  "skipped": ["Row N: reason (only for genuinely unparseable data)"]
}

CSV data:
${csv}`,
      }],
    })

    const text  = message.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return Response.json({ error: 'AI returned invalid JSON' }, { status: 500 })
    }

    // Run calculateTrade on each parsed trade to get full P&L
    const chargedDates = new Set()
    const trades = (parsed.trades ?? []).map(t => {
      const existingDatesForUser = Array.from(chargedDates)

      const result = calculateTrade({
        buy_price:  t.buy_price,
        sell_price: t.sell_price,
        shares:     t.shares,
        buy_date:   t.buy_date,
        sell_date:  t.sell_date,
        type:       'SCALP',
        existingDatesForUser,
      })

      chargedDates.add(t.buy_date)
      if (t.sell_date !== t.buy_date) chargedDates.add(t.sell_date)

      return {
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ticker:     'NVDA',
        type:       'SCALP',
        buy_date:   t.buy_date,
        sell_date:  t.sell_date,
        buy_price:  t.buy_price,
        sell_price: t.sell_price,
        shares:     t.shares,
        ...result,
      }
    })

    return Response.json({
      trades,
      skipped: parsed.skipped ?? [],
    })

  } catch (err) {
    console.error('[/api/trades/parse-csv POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
