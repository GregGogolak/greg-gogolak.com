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
        content: `You are a trade data parser. Parse this CSV and return a JSON array of trades.

Rules:
- Each row should become one trade object
- Dates must be converted to YYYY-MM-DD format regardless of input format (handle day name prefixes like "Friday 29/11/2024", two digit years like "24/02/25", any reasonable date format)
- Numbers must be clean floats (remove commas, currency symbols, quotes)
- Shares must be a number (remove commas from "1,000" → 1000)
- type must be either "SCALP" or "CONVICTION" — infer from context, default to "SCALP" if unclear
- buy_date and sell_date are required — skip rows where you cannot determine either
- buy_price and sell_price must be positive numbers — skip rows where prices are missing or zero
- shares must be a positive number — skip rows where shares are missing
- If sell_date is before buy_date, note it as skipped

Return ONLY valid JSON, no markdown, no explanation:
{
  "trades": [
    {
      "buy_date": "YYYY-MM-DD",
      "sell_date": "YYYY-MM-DD",
      "buy_price": number,
      "sell_price": number,
      "shares": number,
      "type": "SCALP" or "CONVICTION"
    }
  ],
  "skipped": ["Row N: reason for skipping"]
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
        type:       t.type,
        existingDatesForUser,
      })

      chargedDates.add(t.buy_date)
      if (t.sell_date !== t.buy_date) chargedDates.add(t.sell_date)

      return {
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ticker:     'NVDA',
        type:       t.type,
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
