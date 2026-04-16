'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNVDALive } from '@/context/NVDALiveContext'
import { calculateEstimatedPnL } from '@/lib/calculations'
import SummaryCards from '@/components/Track/SummaryCards'
import TradeTable   from '@/components/Track/TradeTable'
import TradeForm    from '@/components/Track/TradeForm'

export default function TrackPage() {
  const { livePrice } = useNVDALive()

  const [trades,        setTrades]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [formOpen,      setFormOpen]      = useState(false)
  const [editTrade,     setEditTrade]     = useState(null)
  const [openPositions, setOpenPositions] = useState([])
  const [includeOpen,   setIncludeOpen]   = useState(false)
  const [closingId,     setClosingId]     = useState(null)
  const [exitPrice,     setExitPrice]     = useState('')
  const [exitDate,      setExitDate]      = useState(new Date().toISOString().split('T')[0])
  const [closeLoading,  setCloseLoading]  = useState(false)

  const fetchTrades = useCallback(async () => {
    try {
      const res  = await fetch('/api/trades')
      const data = await res.json()
      setTrades(Array.isArray(data) ? data : [])
    } catch {
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPositions = useCallback(async () => {
    try {
      const res  = await fetch('/api/positions')
      const data = await res.json()
      setOpenPositions(data.positions ?? [])
    } catch {
      setOpenPositions([])
    }
  }, [])

  useEffect(() => {
    fetchTrades()
    fetchPositions()
  }, [fetchTrades, fetchPositions])

  function openAdd() {
    setEditTrade(null)
    setFormOpen(true)
  }

  function openEdit(trade) {
    setEditTrade(trade)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditTrade(null)
  }

  function handleSaved(savedTrade, isEdit) {
    if (isEdit) {
      setTrades(prev =>
        prev
          .map(t => t.id === savedTrade.id ? savedTrade : t)
          .sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
      )
    } else {
      setTrades(prev =>
        [savedTrade, ...prev].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date))
      )
    }
  }

  async function handleDelete(id) {
    await fetch('/api/trades', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  // Compute estimated values for each open position
  const openEstimates = openPositions.map(p => ({
    ...p,
    estimated: livePrice ? calculateEstimatedPnL(p, livePrice) : null,
  }))

  const openEstimatedNetTotal = openEstimates.reduce(
    (sum, p) => sum + (p.estimated?.estimatedNetEur ?? 0), 0
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080910',
      padding: '28px 24px',
      maxWidth: '1400px',
      margin: '-68px auto 0',
      paddingTop: '96px',
    }}>
      {/* Page header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#3d4a5c',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            NVDA · Trade History
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '26px',
            fontWeight: 600,
            color: '#eef2ff',
            fontFamily: "'Inter Tight', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            Track
          </h1>
        </div>

        <button
          onClick={openAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'rgba(91,156,246,0.13)',
            border: '1px solid rgba(91,156,246,0.28)',
            color: '#7aabf8',
            letterSpacing: '0.02em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(91,156,246,0.2)'
            e.currentTarget.style.borderColor = 'rgba(91,156,246,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(91,156,246,0.13)'
            e.currentTarget.style.borderColor = 'rgba(91,156,246,0.28)'
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          Add Trade
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ marginBottom: '28px' }}>
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.018)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '14px',
                height: '80px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          <SummaryCards
            trades={trades}
            openNetEur={includeOpen ? openEstimatedNetTotal : undefined}
            openCount={includeOpen ? openPositions.length : undefined}
          />
        )}
      </div>

      {/* Open positions section — shown above the closed trades table */}
      {openPositions.length > 0 && (
        <div style={{
          background: '#13131e',
          border: '0.5px solid rgba(59,130,246,0.15)',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(59,130,246,0.06)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(59,130,246,0.6)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>Open Positions</span>

            {/* Include in totals toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
              }}>Include in totals</span>
              <div
                onClick={() => setIncludeOpen(v => !v)}
                style={{
                  width: '36px', height: '20px',
                  borderRadius: '9999px',
                  background: includeOpen ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)',
                  border: `0.5px solid ${includeOpen ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: includeOpen ? '18px' : '2px',
                  width: '14px', height: '14px',
                  borderRadius: '50%',
                  background: includeOpen ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
            </div>
          </div>

          {openEstimates.map((pos, i) => (
            <div key={pos.id}>
              <div style={{
                padding: '12px 0',
                borderBottom: closingId === pos.id
                  ? 'none'
                  : i < openEstimates.length - 1
                  ? '0.5px solid rgba(255,255,255,0.05)'
                  : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {pos.shares.toLocaleString()} shares
                    </span>
                    <span style={{
                      fontFamily: 'JetBrains Mono', fontSize: '10px',
                      padding: '1px 6px', borderRadius: '4px',
                      background: 'rgba(59,130,246,0.1)',
                      color: 'rgba(59,130,246,0.7)',
                      border: '0.5px solid rgba(59,130,246,0.2)',
                    }}>{pos.type ?? 'CONVICTION'}</span>
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    Entry ${pos.entryPrice} · {pos.entryDate} · {pos.estimated?.daysHeld ?? 0}d held
                  </div>
                </div>
                {pos.estimated && (
                  <div style={{ display: 'flex', gap: '20px', textAlign: 'right', flexShrink: 0 }}>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Gross</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: pos.estimated.estimatedGross >= 0 ? '#22c55e' : '#ef4444' }}>
                        {pos.estimated.estimatedGross >= 0 ? '+' : ''}${pos.estimated.estimatedGross.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Est. Net</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', fontWeight: '500', color: pos.estimated.estimatedNetEur >= 0 ? '#22c55e' : '#ef4444' }}>
                        {pos.estimated.estimatedNetEur >= 0 ? '+' : ''}€{pos.estimated.estimatedNetEur.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px' }}>Running Cost</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '13px', color: '#ef4444' }}>
                        -${pos.estimated.totalCosts.toFixed(0)}
                      </div>
                    </div>
                  </div>
                )}
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
                    padding: '4px 10px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    color: 'rgba(239,68,68,0.6)',
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    flexShrink: 0,
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
              </div>
              {closingId === pos.id && (
                <div style={{
                  background: '#0d0d18',
                  border: '0.5px solid rgba(239,68,68,0.15)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginTop: '4px',
                  marginBottom: '8px',
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
                            const [tradesRes, posRes] = await Promise.all([
                              fetch('/api/trades'),
                              fetch('/api/positions'),
                            ])
                            const tradesData = await tradesRes.json()
                            const posData = await posRes.json()
                            setTrades(Array.isArray(tradesData) ? tradesData : [])
                            setOpenPositions(Array.isArray(posData) ? posData : (posData?.positions ?? []))
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
          ))}
        </div>
      )}

      {/* Trade log */}
      <div style={{
        fontSize: '11px',
        fontWeight: 500,
        color: '#3d4a5c',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>
        Trade Log {!loading && trades.length > 0 && `· ${trades.length} trades`}
      </div>

      {loading ? (
        <div style={{
          height: '200px',
          background: 'rgba(255,255,255,0.018)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '14px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <TradeTable
          trades={trades}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form modal */}
      <TradeForm
        open={formOpen}
        editTrade={editTrade}
        onClose={handleClose}
        onSaved={handleSaved}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (min-width: 900px) {
          .summary-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
