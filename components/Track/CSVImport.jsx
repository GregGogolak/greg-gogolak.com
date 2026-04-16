'use client'
import { useState, useRef } from 'react'
import { calculateTrade } from '@/lib/tradeCalculations'

// Column name aliases — maps various broker export formats to our standard fields
const COLUMN_ALIASES = {
  buy_date:   ['buy date', 'purchase date', 'open date', 'entry date', 'date bought', 'buy_date', 'open', 'date'],
  sell_date:  ['sell date', 'close date', 'exit date', 'date sold', 'sell_date', 'close', 'sold date'],
  buy_price:  ['buy price', 'purchase price', 'entry price', 'open price', 'avg buy', 'buy_price', 'price bought', 'cost'],
  sell_price: ['sell price', 'exit price', 'close price', 'avg sell', 'sell_price', 'price sold', 'proceeds'],
  shares:     ['shares', 'quantity', 'qty', 'units', 'amount', 'size', 'contracts', 'volume'],
  type:       ['type', 'trade type', 'strategy', 'style'],
}

function normalise(str) {
  return str?.toLowerCase().trim().replace(/[^a-z0-9 _]/g, '') ?? ''
}

function detectColumn(headers, field) {
  const aliases = COLUMN_ALIASES[field]
  for (const header of headers) {
    const norm = normalise(header)
    if (aliases.some(a => norm === a || norm.includes(a))) return header
  }
  return null
}

function parseDate(raw) {
  if (!raw) return null
  const cleaned = raw.trim()
  // Try YYYY-MM-DD first
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  // Try DD/MM/YYYY
  const dmy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // Try MM/DD/YYYY (ambiguous with above — only reached if dmy didn't match)
  const mdy = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  return null
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? '' })
    return row
  })
  return { headers, rows }
}

// Shared styles
const cardStyle = {
  background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
  border: '0.5px solid rgba(255,255,255,0.08)',
  borderRadius: '18px',
  padding: '20px 24px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
  marginBottom: '16px',
}
const eyebrow = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.25)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '16px',
}
const btnPrimary = {
  padding: '8px 16px',
  borderRadius: '9999px',
  background: 'rgba(59,130,246,0.12)',
  border: '0.5px solid rgba(59,130,246,0.3)',
  color: 'rgba(59,130,246,0.9)',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  cursor: 'pointer',
  letterSpacing: '0.06em',
  transition: 'all 0.2s ease',
}
const btnSecondary = {
  padding: '8px 16px',
  borderRadius: '9999px',
  background: 'transparent',
  border: '0.5px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.35)',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '11px',
  cursor: 'pointer',
  letterSpacing: '0.06em',
  transition: 'all 0.2s ease',
}
const inputStyle = {
  background: 'rgba(0,0,0,0.25)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '7px 10px',
  color: 'rgba(255,255,255,0.75)',
  fontFamily: 'Inter, sans-serif',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
}

export default function CSVImport({ onImportComplete }) {
  const [step,          setStep]          = useState('idle') // idle | mapping | preview | done
  const [file,          setFile]          = useState(null)
  const [headers,       setHeaders]       = useState([])
  const [columnMap,     setColumnMap]     = useState({})
  const [rawRows,       setRawRows]       = useState([])
  const [parsedTrades,  setParsedTrades]  = useState([])
  const [errors,        setErrors]        = useState([])
  const [importing,     setImporting]     = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result)
      setHeaders(headers)
      setRawRows(rows)
      // Auto-detect columns
      const detected = {}
      Object.keys(COLUMN_ALIASES).forEach(field => {
        const match = detectColumn(headers, field)
        if (match) detected[field] = match
      })
      setColumnMap(detected)
      setStep('mapping')
    }
    reader.readAsText(f)
  }

  const buildPreview = () => {
    const errs = []
    const trades = []
    const chargedDates = new Set() // dates already charged in this import batch

    rawRows.forEach((row, i) => {
      const rowNum = i + 2 // 1-indexed, skip header
      const buy_date  = parseDate(row[columnMap.buy_date])
      const sell_date = parseDate(row[columnMap.sell_date])
      const buy_price  = parseFloat(row[columnMap.buy_price])
      const sell_price = parseFloat(row[columnMap.sell_price])
      const shares     = parseFloat(row[columnMap.shares])
      const type = row[columnMap.type]?.toUpperCase() === 'SCALP' ? 'SCALP' : 'CONVICTION'

      if (!buy_date)                          { errs.push(`Row ${rowNum}: cannot parse buy date "${row[columnMap.buy_date]}"`) ; return }
      if (!sell_date)                         { errs.push(`Row ${rowNum}: cannot parse sell date "${row[columnMap.sell_date]}"`) ; return }
      if (isNaN(buy_price)  || buy_price <= 0)  { errs.push(`Row ${rowNum}: invalid buy price`) ; return }
      if (isNaN(sell_price) || sell_price <= 0) { errs.push(`Row ${rowNum}: invalid sell price`) ; return }
      if (isNaN(shares)     || shares <= 0)     { errs.push(`Row ${rowNum}: invalid shares`) ; return }
      if (sell_date < buy_date)               { errs.push(`Row ${rowNum}: sell date before buy date`) ; return }

      const existingDatesForUser = Array.from(chargedDates)

      const result = calculateTrade({
        buy_price, sell_price, shares, buy_date, sell_date, type,
        existingDatesForUser,
      })

      // Mark these dates as charged for subsequent rows in this batch
      chargedDates.add(buy_date)
      if (sell_date !== buy_date) chargedDates.add(sell_date)

      trades.push({
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ticker:     'NVDA',
        type,
        buy_date,
        sell_date,
        buy_price,
        sell_price,
        shares,
        ...result,
      })
    })

    setErrors(errs)
    setParsedTrades(trades)
    setStep('preview')
  }

  const confirmImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/trades/bulk', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ trades: parsedTrades }),
      })
      if (res.ok) {
        setStep('done')
        onImportComplete?.()
      }
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setStep('idle')
    setFile(null)
    setHeaders([])
    setColumnMap({})
    setRawRows([])
    setParsedTrades([])
    setErrors([])
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── idle ──────────────────────────────────────────────────────────────────
  if (step === 'idle') return (
    <div style={cardStyle}>
      <span style={eyebrow}>Import CSV</span>
      <div
        style={{
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>↑</div>
        <div style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
          Drop CSV file or click to browse
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
          Any format — columns will be detected automatically
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
      </div>
    </div>
  )

  // ── mapping ───────────────────────────────────────────────────────────────
  if (step === 'mapping') return (
    <div style={cardStyle}>
      <span style={eyebrow}>Map Columns — {file?.name}</span>
      <div style={{ marginBottom: '12px', fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
        {rawRows.length} rows detected. Confirm column mapping below.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {Object.keys(COLUMN_ALIASES).map(field => (
          <div key={field}>
            <label style={{
              display: 'block',
              fontFamily: 'JetBrains Mono',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}>{field.replace('_', ' ')}</label>
            <select
              value={columnMap[field] ?? ''}
              onChange={e => setColumnMap(m => ({ ...m, [field]: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— not mapped —</option>
              {headers.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={{
            ...btnPrimary,
            opacity: (!columnMap.buy_date || !columnMap.sell_date || !columnMap.buy_price || !columnMap.sell_price || !columnMap.shares) ? 0.4 : 1,
            cursor:  (!columnMap.buy_date || !columnMap.sell_date || !columnMap.buy_price || !columnMap.sell_price || !columnMap.shares) ? 'not-allowed' : 'pointer',
          }}
          onClick={buildPreview}
          disabled={!columnMap.buy_date || !columnMap.sell_date || !columnMap.buy_price || !columnMap.sell_price || !columnMap.shares}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Preview Import
        </button>
        <button style={btnSecondary} onClick={reset}>Cancel</button>
      </div>
    </div>
  )

  // ── preview ───────────────────────────────────────────────────────────────
  if (step === 'preview') return (
    <div style={cardStyle}>
      <span style={eyebrow}>Preview — {parsedTrades.length} trades ready to import</span>

      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '0.5px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '14px',
        }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(239,68,68,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {errors.length} row{errors.length !== 1 ? 's' : ''} skipped
          </div>
          {errors.map((e, i) => (
            <div key={i} style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginBottom: '2px' }}>{e}</div>
          ))}
        </div>
      )}

      {parsedTrades.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                {['Dates', 'Type', 'Shares', 'Buy', 'Sell', 'Gross P&L', 'Platform', 'Net EUR'].map(col => (
                  <th key={col} style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '6px 10px',
                    textAlign: 'left',
                    fontWeight: '400',
                    borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedTrades.map((t, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    {t.buy_date}{t.buy_date !== t.sell_date ? ` → ${t.sell_date}` : ''}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      background: t.type === 'SCALP' ? 'rgba(59,130,246,0.1)' : 'rgba(99,102,241,0.1)',
                      color:      t.type === 'SCALP' ? 'rgba(59,130,246,0.8)' : 'rgba(99,102,241,0.8)',
                      border: `0.5px solid ${t.type === 'SCALP' ? 'rgba(59,130,246,0.25)' : 'rgba(99,102,241,0.25)'}`,
                    }}>{t.type}</span>
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    {t.shares.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    ${t.buy_price}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    ${t.sell_price}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: '500', color: t.gross_pnl_usd >= 0 ? '#22c55e' : '#ef4444' }}>
                    {t.gross_pnl_usd >= 0 ? '+' : ''}${t.gross_pnl_usd.toFixed(0)}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '11px', color: t.platform_fees_usd === 0 ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.4)' }}>
                    {t.platform_fees_usd === 0 ? 'FREE' : `$${t.platform_fees_usd.toFixed(0)}`}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono', fontSize: '12px', fontWeight: '500', color: t.net_eur >= 0 ? '#22c55e' : '#ef4444' }}>
                    {t.net_eur >= 0 ? '+' : ''}€{t.net_eur.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          style={{
            ...btnPrimary,
            opacity: (importing || parsedTrades.length === 0) ? 0.5 : 1,
            cursor:  (importing || parsedTrades.length === 0) ? 'not-allowed' : 'pointer',
          }}
          onClick={confirmImport}
          disabled={importing || parsedTrades.length === 0}
          onMouseEnter={e => { if (!importing) { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {importing ? 'Importing...' : `Confirm Import (${parsedTrades.length} trade${parsedTrades.length !== 1 ? 's' : ''})`}
        </button>
        <button style={btnSecondary} onClick={reset}>Start Over</button>
      </div>
    </div>
  )

  // ── done ──────────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div style={cardStyle}>
      <span style={eyebrow}>Import Complete</span>
      <div style={{ fontFamily: 'Inter', fontSize: '14px', color: '#22c55e', marginBottom: '12px' }}>
        {parsedTrades.length} trade{parsedTrades.length !== 1 ? 's' : ''} imported successfully
      </div>
      <button style={btnSecondary} onClick={reset}>Import Another File</button>
    </div>
  )

  return null
}
