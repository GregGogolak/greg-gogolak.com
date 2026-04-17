import Anthropic from '@anthropic-ai/sdk'
import { getUserId } from '@/lib/auth'
import { calculateTrade } from '@/lib/tradeCalculations'

const client = new Anthropic()

async function parseChunk(headerLine, chunkLines, delimiter) {
  const chunkCsv = [headerLine, ...chunkLines].join('\n')
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Parse this CSV chunk and return JSON only. No markdown, no explanation.

Delimiter is "${delimiter}". Headers may be Slovak or English:
- datum nakupu / Date Bought = buy_date
- datum predaja / Date Sold = sell_date
- nakup / Bought = buy_price
- predaj / Sold = sell_price
- pocet ks / shares = shares
- akcie / stock = ticker

European numbers: "1 720,00" = 1720.00, "218,88" = 218.88 (space=thousands, comma=decimal).
Dates to YYYY-MM-DD.

- Only import rows where the stock/ticker is NVIDIA or NVDA (case insensitive). Skip all other tickers silently.
- Only skip rows where dates are completely missing or unparseable
- Do NOT use any fee/cost columns from the CSV — we will recalculate fees ourselves
- Do NOT skip rows based on fee or profit values

Return:
{"trades":[{"buy_date":"YYYY-MM-DD","sell_date":"YYYY-MM-DD","buy_price":number,"sell_price":number,"shares":number,"ticker":"NVDA"}],"skipped":["Row N: reason (only for genuinely unparseable dates or non-NVDA ticker)"]}

CSV:
${chunkCsv}`,
    }],
  })

  const text = message.content[0].text
  let clean = text.replace(/```json|```/g, '').trim()
  if (!clean.startsWith('{')) {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)
  }
  return JSON.parse(clean)
}

export async function POST(request) {
  try {
    await getUserId()

    const { csv } = await request.json()
    if (!csv) return Response.json({ error: 'No CSV provided' }, { status: 400 })

    // Detect delimiter
    const delimiter = csv.includes(';') ? ';' : ','

    // Split and clean lines
    const lines = csv.split(/\r?\n/)
    const headerLine = lines[0]
    const dataLines = lines.slice(1).filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      const cols = trimmed.split(delimiter)
      const firstCol = cols[0]?.trim().replace(/^"|"$/g, '') ?? ''
      const secondCol = cols[1]?.trim().replace(/^"|"$/g, '') ?? ''
      if (!firstCol && !secondCol) return false
      if (!firstCol) return false
      if (/^[a-zA-Z]{4,}/.test(firstCol) && !/^\d/.test(firstCol)) return false
      return true
    })

    // Chunk into batches of 20 rows
    const CHUNK_SIZE = 20
    const chunks = []
    for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
      chunks.push(dataLines.slice(i, i + CHUNK_SIZE))
    }

    // Parse all chunks in parallel
    const results = await Promise.all(
      chunks.map(chunk => parseChunk(headerLine, chunk, delimiter))
    )

    // Merge results
    const allTrades = results.flatMap(r => r.trades ?? []).filter(t => {
      const ticker = (t.ticker ?? '').toUpperCase().trim()
      return ticker === 'NVDA' || ticker === 'NVIDIA' || ticker === ''
    })
    const allSkipped = results.flatMap(r => r.skipped ?? [])

    // Run calculateTrade on each
    const chargedDates = new Set()
    const trades = allTrades.map(t => {
      const result = calculateTrade({
        buy_price:  t.buy_price,
        sell_price: t.sell_price,
        shares:     t.shares,
        buy_date:   t.buy_date,
        sell_date:  t.sell_date,
        type:       'SCALP',
        existingDatesForUser: Array.from(chargedDates),
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

    return Response.json({ trades, skipped: allSkipped })

  } catch (err) {
    console.error('[/api/trades/parse-csv POST]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
