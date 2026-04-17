import Anthropic from '@anthropic-ai/sdk'
import { getUserId } from '@/lib/auth'
import { calculateTrade } from '@/lib/tradeCalculations'

export async function POST(request) {
  try {
    await getUserId() // throws if unauthenticated

    const { csv } = await request.json()
    if (!csv) return Response.json({ error: 'No CSV provided' }, { status: 400 })

    // Pre-process: normalise delimiter and strip junk rows
    const delimiter = csv.includes(';') ? ';' : ','
    const lines = csv.split(/\r?\n/)
    const headerLine = lines[0]
    const dataLines = lines.slice(1).filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      const cols = trimmed.split(delimiter)
      // Skip rows where first two columns (dates) are empty
      if (!cols[0]?.trim() && !cols[1]?.trim()) return false
      // Skip summary/footer rows that start with non-date text
      const firstCol = cols[0]?.trim().replace(/^"|"$/g, '')
      if (!firstCol) return false
      if (/^[a-zA-Z]{4,}/.test(firstCol) && !/^\d/.test(firstCol)) return false
      return true
    })
    const cleanedCsv = [headerLine, ...dataLines].join('\n')

    const client = new Anthropic()

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role:    'user',
        content: `You are a trade data parser. Parse this CSV and return trades as JSON.

The CSV may use semicolons (;) or commas (,) as delimiters — detect automatically.
Column headers may be in Slovak or English. Map them:
- "datum nakupu" or "Date Bought" or similar = buy_date
- "datum predaja" or "Date Sold" or similar = sell_date
- "nakup" or "Bought" or "buy price" or similar = buy_price
- "predaj" or "Sold" or "sell price" or similar = sell_price
- "pocet ks" or "shares" or "pocet" or similar = shares
- "akcie" or "stock" or "ticker" or similar = ticker

Numbers may use European format with spaces as thousand separators and commas as decimals (e.g. "1 720,00" = 1720.00, "218,88" = 218.88). Convert all to clean floats.

CRITICAL RULES:
- Import ALL stocks found (NVDA, Apple, LMT, etc.) — set ticker field to whatever stock it is
- Include loss trades where sell_price < buy_price — these are valid
- Include zero-profit trades where buy_price = sell_price — these are valid
- Only skip rows where dates are completely missing or unparseable
- Do NOT use any fee/cost columns from the CSV — we will recalculate fees ourselves
- Do NOT skip rows based on fee or profit values

Return ONLY valid JSON, no markdown, no explanation:
{
  "trades": [
    {
      "buy_date": "YYYY-MM-DD",
      "sell_date": "YYYY-MM-DD",
      "buy_price": number,
      "sell_price": number,
      "shares": number,
      "ticker": "NVDA"
    }
  ],
  "skipped": ["Row N: reason (only for genuinely unparseable dates)"]
}

CSV data:
${cleanedCsv}`,
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
        ticker:     (t.ticker ?? 'NVDA').toUpperCase(),
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
