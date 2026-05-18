'use client'
import { useState } from 'react'
import { useNVDALive } from '@/context/NVDALiveContext'
import { calculateEstimatedPnL } from '@/lib/calculations'

const card = {
  background: 'rgba(255,255,255,0.028)',
  border: '1px solid rgba(255,255,255,0.065)',
  borderRadius: '14px', padding: '16px 18px',
}

export default function PositionPanel({ positions = [], currentPrice, onAdd, onRemove, onRefresh, style: styleProp }) {
  const { livePrice, isLiveFresh } = useNVDALive()

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ type: 'CONVICTION', shares: '', entryPrice: '', entryDate: new Date().toISOString().split('T')[0], label: '' })

  // Close flow state
  const [closingId,    setClosingId]    = useState(null)
  const [exitPrice,    setExitPrice]    = useState('')
  const [exitDate,     setExitDate]     = useState(new Date().toISOString().split('T')[0])
  const [closeLoading, setCloseLoading] = useState(false)

  // Optimistic hide: track IDs closed this session so panel updates without a full refetch
  const [closedIds, setClosedIds] = useState(new Set())

  function handleAdd(e) {
    e.preventDefault()
    onAdd?.({ ...form, shares: Number(form.shares), entryPrice: Number(form.entryPrice) })
    setForm({ type: 'CONVICTION', shares: '', entryPrice: '', entryDate: new Date().toISOString().split('T')[0], label: '' })
    setShowForm(false)
  }

  const priceToUse      = isLiveFresh ? livePrice : currentPrice
  const visiblePositions = positions.filter(p => !closedIds.has(p.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...styleProp }}>
      <div style={{ ...card, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => setShowForm(v => !v)} style={{
            background: 'rgba(91,156,246,0.12)', border: '1px solid rgba(91,156,246,0.25)',
            color: '#5b9cf6', borderRadius: '7px', padding: '3px 10px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>

        {visiblePositions.length === 0 && !showForm && (
          <div style={{ fontSize: '13px', color: '#3d4a5c', textAlign: 'center', padding: '10px 0' }}>No open positions</div>
        )}

        {visiblePositions.map(pos => {
          const estimated = priceToUse ? calculateEstimatedPnL(pos, priceToUse) : null
          return (
            <div key={pos.id} style={{ borderTop: '1px solid rgba(255,255,255,0.065)', paddingTop: '10px', marginTop: '4px' }}>
              {/* Position header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px',
                    color: pos.type === 'CONVICTION' ? '#5b9cf6' : '#fb923c',
                    background: pos.type === 'CONVICTION' ? 'rgba(91,156,246,0.1)' : 'rgba(251,146,60,0.1)',
                    marginRight: '6px',
                  }}>{pos.type}</span>
                  <span style={{ fontSize: '12px', color: '#8892a8' }}>
                    {pos.shares.toLocaleString()} shares @ ${pos.entryPrice}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setClosingId(pos.id)
                      setExitPrice('')
                      setExitDate(new Date().toISOString().split('T')[0])
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '0.5px solid rgba(239,68,68,0.2)',
                      borderRadius: '9999px',
                      padding: '3px 8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      color: 'rgba(239,68,68,0.6)',
                      cursor: 'pointer',
                      letterSpacing: '0.08em',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                      e.currentTarget.style.color = 'rgba(239,68,68,0.9)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                      e.currentTarget.style.color = 'rgba(239,68,68,0.6)'
                    }}
                  >
                    CLOSE
                  </button>
                  <button onClick={() => onRemove?.(pos.id)} style={{
                    background: 'none', border: 'none', color: '#3d4a5c',
                    fontSize: '14px', cursor: 'pointer', padding: '0 2px',
                  }}>×</button>
                </div>
              </div>

              {/* Live estimated P&L row */}
              {estimated && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Gross</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '500',
                      color: estimated.estimatedGross >= 0 ? '#22c55e' : '#ef4444',
                    }}>{estimated.estimatedGross >= 0 ? '+' : ''}${estimated.estimatedGross.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Net EUR</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '500',
                      color: estimated.estimatedNetEur >= 0 ? '#22c55e' : '#ef4444',
                    }}>{estimated.estimatedNetEur >= 0 ? '+' : ''}€{estimated.estimatedNetEur.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Days Held</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{estimated.daysHeld}d</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Running Cost</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#ef4444' }}>-${estimated.totalCosts.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* Close form — shown inline below this position */}
              {closingId === pos.id && (
                <div style={{
                  background: '#0d0d18',
                  border: '0.5px solid rgba(239,68,68,0.15)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginTop: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}>Close Position — Enter actual fill values</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}>Exit Price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={exitPrice}
                        onChange={e => setExitPrice(e.target.value)}
                        placeholder="e.g. 192.50"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(0,0,0,0.3)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: 'rgba(255,255,255,0.85)',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.3)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}>Exit Date</label>
                      <input
                        type="date"
                        value={exitDate}
                        onChange={e => setExitDate(e.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: 'rgba(0,0,0,0.3)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          color: 'rgba(255,255,255,0.85)',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (!exitPrice || !exitDate) return
                        setCloseLoading(true)
                        try {
                          const res = await fetch('/api/positions', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              positionId: pos.id,
                              exitPrice: parseFloat(exitPrice),
                              exitDate,
                            }),
                          })
                          if (res.ok) {
                            setClosingId(null)
                            setExitPrice('')
                            setClosedIds(prev => new Set([...prev, pos.id]))
                            if (onRefresh) onRefresh()
                          }
                        } finally {
                          setCloseLoading(false)
                        }
                      }}
                      disabled={!exitPrice || !exitDate || closeLoading}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '9999px',
                        background: exitPrice && exitDate ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `0.5px solid ${exitPrice && exitDate ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: exitPrice && exitDate ? '#22c55e' : 'rgba(255,255,255,0.2)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        cursor: exitPrice && exitDate ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.06em',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {closeLoading ? 'CLOSING...' : 'CONFIRM CLOSE'}
                    </button>
                    <button
                      onClick={() => { setClosingId(null); setExitPrice('') }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        background: 'none',
                        border: '0.5px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                        letterSpacing: '0.06em',
                      }}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.065)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['CONVICTION', 'SCALP'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  flex: 1, padding: '5px 0', borderRadius: '7px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  fontSize: '11px', fontWeight: 600,
                  border: form.type === t ? `1px solid ${t === 'CONVICTION' ? 'rgba(91,156,246,0.4)' : 'rgba(251,146,60,0.4)'}` : '1px solid rgba(255,255,255,0.065)',
                  background: form.type === t ? (t === 'CONVICTION' ? 'rgba(91,156,246,0.12)' : 'rgba(251,146,60,0.1)') : 'transparent',
                  color: form.type === t ? (t === 'CONVICTION' ? '#5b9cf6' : '#fb923c') : '#3d4a5c',
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Shares" type="number" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} required style={inputStyle} />
              <input placeholder="Entry $" type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} required style={inputStyle} />
            </div>
            <input type="date" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} style={inputStyle} />
            <button type="submit" style={{
              background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.3)',
              color: '#5b9cf6', borderRadius: '8px', padding: '8px',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>Add Position</button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle = {
  flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px', padding: '6px 10px', color: '#eef2ff', fontSize: '12px',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}
