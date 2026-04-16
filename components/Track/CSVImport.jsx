'use client'
import { useState, useRef } from 'react'

// Retained as fallback utility — not used in the main AI flow
function parseDate(raw) {
  if (!raw) return null
  let cleaned = raw.trim().replace(/^"|"$/g, '')
  cleaned = cleaned.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+/i, '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned
  const dmy4 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy4) return `${dmy4[3]}-${dmy4[2].padStart(2,'0')}-${dmy4[1].padStart(2,'0')}`
  const dmy2 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (dmy2) return `20${dmy2[3]}-${dmy2[2].padStart(2,'0')}-${dmy2[1].padStart(2,'0')}`
  const dmyd = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyd) return `${dmyd[3]}-${dmyd[2].padStart(2,'0')}-${dmyd[1].padStart(2,'0')}`
  const mdy4 = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy4) return `${mdy4[3]}-${mdy4[1].padStart(2,'0')}-${mdy4[2].padStart(2,'0')}`
  return null
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
  transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
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
  transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
}

export default function CSVImport({ onImportComplete }) {
  const [step,         setStep]         = useState('idle') // idle | parsing | preview | done
  const [file,         setFile]         = useState(null)
  const [parsedTrades, setParsedTrades] = useState([])
  const [errors,       setErrors]       = useState([])
  const [importing,    setImporting]    = useState(false)
  const fileRef = useRef()

  const parseWithAI = async (fileOverride) => {
    const targetFile = fileOverride ?? file
    setStep('parsing')
    try {
      const csvText = await targetFile.text()

      const response = await fetch('/api/trades/parse-csv', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ csv: csvText }),
      })

      const data = await response.json()

      if (data.error) {
        setErrors([`AI parsing failed: ${data.error}`])
        setStep('idle')
        return
      }

      setParsedTrades(data.trades ?? [])
      setErrors(data.skipped ?? [])
      setStep('preview')
    } catch (err) {
      setErrors([`AI parsing failed: ${err.message}. Please try again.`])
      setStep('idle')
    }
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    // Immediately start AI parsing — no manual mapping needed
    setTimeout(() => parseWithAI(f), 100)
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
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={() => fileRef.current?.click()}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.4 }}>↑</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
          Drop CSV file or click to browse
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
          Any format — Claude reads your columns automatically
        </div>
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
      </div>

      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '0.5px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginTop: '14px',
        }}>
          {errors.map((e, i) => (
            <div key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(239,68,68,0.6)' }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  )

  // ── parsing ───────────────────────────────────────────────────────────────
  if (step === 'parsing') return (
    <div style={cardStyle}>
      <span style={eyebrow}>Analysing File</span>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '24px 0',
      }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.6)',
              animation: 'jarvisPulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          Claude is reading your file...
        </span>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.08em',
      }}>{file?.name}</div>
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
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(239,68,68,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {errors.length} row{errors.length !== 1 ? 's' : ''} skipped
          </div>
          {errors.map((e, i) => (
            <div key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(239,68,68,0.6)', marginBottom: '2px' }}>{e}</div>
          ))}
        </div>
      )}

      {parsedTrades.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                {['Dates', 'Shares', 'Buy', 'Sell', 'Gross P&L', 'Platform', 'Net EUR'].map(col => (
                  <th key={col} style={{
                    fontFamily: 'JetBrains Mono, monospace',
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
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    {t.buy_date}{t.buy_date !== t.sell_date ? ` → ${t.sell_date}` : ''}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    {t.shares.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    ${t.buy_price}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    ${t.sell_price}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: '500', color: t.gross_pnl_usd >= 0 ? '#22c55e' : '#ef4444' }}>
                    {t.gross_pnl_usd >= 0 ? '+' : ''}${t.gross_pnl_usd.toFixed(0)}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    {t.platform_fees_usd === 0 ? 'FREE' : `$${t.platform_fees_usd.toFixed(0)}`}
                  </td>
                  <td style={{ padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: '500', color: t.net_eur >= 0 ? '#22c55e' : '#ef4444' }}>
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
          onMouseEnter={e => { if (!importing) { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)' }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
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
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#22c55e', marginBottom: '12px' }}>
        {parsedTrades.length} trade{parsedTrades.length !== 1 ? 's' : ''} imported successfully
      </div>
      <button style={btnSecondary} onClick={reset}>Import Another File</button>
    </div>
  )

  return null
}
