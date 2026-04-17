'use client'
import { useState, useEffect, useCallback } from 'react'
import { useNVDALive } from '@/context/NVDALiveContext'
import { calculateEstimatedPnL } from '@/lib/calculations'
import { calculateSharedPlatformFee, recalculateNetWithSharedFees } from '@/lib/tradeCalculations'
import SummaryCards from '@/components/Track/SummaryCards'
import TradeTable   from '@/components/Track/TradeTable'
import TradeForm    from '@/components/Track/TradeForm'
import CSVImport    from '@/components/Track/CSVImport'

export default function TrackPage() {
  const { livePrice } = useNVDALive()

  const [trades,        setTrades]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [formOpen,      setFormOpen]      = useState(false)
  const [editTrade,     setEditTrade]     = useState(null)
  const [openPositions, setOpenPositions] = useState([])
  const [includeOpen,   setIncludeOpen]   = useState(false)
  const [platformFeeMap, setPlatformFeeMap] = useState(null)
  const [showImport,    setShowImport]    = useState(false)
  const [closingId,     setClosingId]     = useState(null)
  const [exitPrice,     setExitPrice]     = useState('')
  const [exitDate,      setExitDate]      = useState(new Date().toISOString().split('T')[0])
  const [closeLoading,  setCloseLoading]  = useState(false)

  // Select mode + soft-delete bin
  const [selectMode,           setSelectMode]           = useState(false)
  const [selectedIds,          setSelectedIds]          = useState(new Set())
  const [deletedTrades,        setDeletedTrades]        = useState([])
  const [deletedOpen,          setDeletedOpen]          = useState(false)
  const [deletedSelectMode,    setDeletedSelectMode]    = useState(false)
  const [deletedSelectedIds,   setDeletedSelectedIds]   = useState(new Set())

  // Open position inline form
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [newPosition,     setNewPosition]     = useState({ entryPrice: '', shares: '', entryDate: new Date().toISOString().split('T')[0] })
  const [addingPosition,  setAddingPosition]  = useState(false)

  // Payouts
  const [payouts,          setPayouts]          = useState([])
  const [newPayoutAmount,  setNewPayoutAmount]  = useState('')
  const [newPayoutDate,    setNewPayoutDate]    = useState('')
  const [addingPayout,     setAddingPayout]     = useState(false)

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
    const fetchPlatformFees = async () => {
      try {
        const res = await fetch('/api/platform-fees')
        const data = await res.json()
        setPlatformFeeMap(data.dateMap ?? null)
      } catch {}
    }
    fetchPlatformFees()
    fetch('/api/payouts')
      .then(r => r.json())
      .then(data => setPayouts(Array.isArray(data) ? data : []))
      .catch(() => {})
    fetch('/api/trades/deleted')
      .then(r => r.json())
      .then(data => setDeletedTrades(Array.isArray(data) ? data : []))
      .catch(() => {})
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

  async function handleSoftDelete(id) {
    const trade = trades.find(t => t.id === id)
    if (!trade) return
    await fetch('/api/trades/deleted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trade }),
    })
    setTrades(prev => prev.filter(t => t.id !== id))
    setDeletedTrades(prev => [{ ...trade, deleted_at: new Date().toISOString() }, ...prev])
  }

  async function handleBulkSoftDelete() {
    for (const id of selectedIds) {
      await handleSoftDelete(id)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  async function handleRestore(id) {
    await fetch('/api/trades/deleted', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, permanent: false }),
    })
    const trade = deletedTrades.find(t => t.id === id)
    if (trade) {
      const { deleted_at, ...original } = trade
      setTrades(prev => [original, ...prev].sort((a, b) => new Date(b.sell_date) - new Date(a.sell_date)))
    }
    setDeletedTrades(prev => prev.filter(t => t.id !== id))
  }

  async function handlePermanentDeleteFromBin(id) {
    await fetch('/api/trades/deleted', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, permanent: true }),
    })
    setDeletedTrades(prev => prev.filter(t => t.id !== id))
  }

  // Recalculate net sum using shared platform fees (visual only, stored data unchanged)
  const adjustedNetSum = trades.reduce((sum, trade) => {
    if (!platformFeeMap) return sum + (trade.net_eur ?? 0)
    const sharedFees = calculateSharedPlatformFee(trade, platformFeeMap)
    const { adjustedNetEur } = recalculateNetWithSharedFees(trade, sharedFees)
    return sum + adjustedNetEur
  }, 0)

  const totalPayouts = payouts.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const remaining    = adjustedNetSum - totalPayouts

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
      background: '#0d0d14',
      padding: '28px 24px',
      maxWidth: '1400px',
      margin: '-68px auto 0',
      paddingTop: '96px',
      isolation: 'isolate',
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
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.25)',
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setShowImport(v => !v)}
            style={{
              padding: '9px 16px',
              borderRadius: '9999px',
              background: showImport ? 'rgba(59,130,246,0.12)' : 'transparent',
              border: `0.5px solid ${showImport ? 'rgba(59,130,246,0.28)' : 'rgba(255,255,255,0.1)'}`,
              color: showImport ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.35)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {showImport ? 'Hide Import' : 'Import CSV'}
          </button>

          <button
            onClick={() => setShowAddPosition(v => !v)}
            style={{
              padding: '8px 14px',
              borderRadius: '9999px',
              background: showAddPosition ? 'rgba(59,130,246,0.12)' : 'transparent',
              border: `0.5px solid ${showAddPosition ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: showAddPosition ? 'rgba(59,130,246,0.8)' : 'rgba(255,255,255,0.35)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {showAddPosition ? 'Cancel' : '+ Open Position'}
          </button>

          <button
            onClick={openAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '9999px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'rgba(59,130,246,0.13)',
              border: '0.5px solid rgba(59,130,246,0.28)',
              color: 'rgba(59,130,246,0.9)',
              letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(59,130,246,0.22)'
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(59,130,246,0.13)'
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.28)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Add Trade
          </button>
        </div>
      </div>

      {/* Open position inline form */}
      {showAddPosition && (
        <div style={{
          background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: '16px',
          }}>New Open Position</span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}>Entry Price (USD)</label>
              <input
                type="number"
                step="0.01"
                value={newPosition.entryPrice}
                onChange={e => setNewPosition(p => ({ ...p, entryPrice: e.target.value }))}
                placeholder="e.g. 185.00"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.25)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
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
                marginBottom: '5px',
              }}>Shares</label>
              <input
                type="number"
                step="1"
                value={newPosition.shares}
                onChange={e => setNewPosition(p => ({ ...p, shares: e.target.value }))}
                placeholder="e.g. 1000"
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.25)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
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
                marginBottom: '5px',
              }}>Entry Date</label>
              <input
                type="date"
                value={newPosition.entryDate}
                onChange={e => setNewPosition(p => ({ ...p, entryDate: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.25)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            onClick={async () => {
              if (!newPosition.entryPrice || !newPosition.shares) return
              setAddingPosition(true)
              try {
                const res = await fetch('/api/positions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'add',
                    payload: {
                      entryPrice: parseFloat(newPosition.entryPrice),
                      shares: parseInt(newPosition.shares),
                      entryDate: newPosition.entryDate,
                      type: 'SCALP',
                    },
                  }),
                })
                if (res.ok) {
                  setShowAddPosition(false)
                  setNewPosition({ entryPrice: '', shares: '', entryDate: new Date().toISOString().split('T')[0] })
                  const posRes = await fetch('/api/positions')
                  const posData = await posRes.json()
                  setOpenPositions(Array.isArray(posData) ? posData : (posData?.positions ?? []))
                }
              } finally {
                setAddingPosition(false)
              }
            }}
            disabled={!newPosition.entryPrice || !newPosition.shares || addingPosition}
            style={{
              padding: '9px 20px',
              borderRadius: '9999px',
              background: newPosition.entryPrice && newPosition.shares ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
              border: `0.5px solid ${newPosition.entryPrice && newPosition.shares ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: newPosition.entryPrice && newPosition.shares ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.2)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              cursor: newPosition.entryPrice && newPosition.shares ? 'pointer' : 'not-allowed',
              letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {addingPosition ? 'Adding...' : 'Add Position'}
          </button>
        </div>
      )}

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
                background: '#13131e',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: '18px',
                height: '80px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          <SummaryCards
            trades={trades}
            openNetEur={includeOpen ? openEstimatedNetTotal : undefined}
            openCount={includeOpen ? openPositions.length : undefined}
            adjustedNetEur={platformFeeMap ? adjustedNetSum : undefined}
            platformFeeMap={platformFeeMap}
          />
        )}
      </div>

      {/* CSV import panel */}
      {showImport && (
        <CSVImport
          onImportComplete={() => {
            setShowImport(false)
            fetch('/api/trades').then(r => r.json()).then(data => {
              setTrades(Array.isArray(data) ? data : [])
            })
            fetch('/api/platform-fees').then(r => r.json()).then(data => {
              setPlatformFeeMap(data.dateMap ?? null)
            })
          }}
        />
      )}

      {/* Open positions section — shown above the closed trades table */}
      {openPositions.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '12px',
          boxShadow: `
            0 12px 40px rgba(0,0,0,0.5),
            0 4px 16px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.07)
          `,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(59,130,246,0.5)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>Open Positions</span>

            {/* Include in totals toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>Include in totals</span>
              <div
                onClick={() => setIncludeOpen(v => !v)}
                style={{
                  width: '36px',
                  height: '20px',
                  borderRadius: '9999px',
                  background: includeOpen ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.06)',
                  border: `0.5px solid ${includeOpen ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: includeOpen ? '17px' : '3px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: includeOpen ? '#3b82f6' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  boxShadow: includeOpen ? '0 0 8px rgba(59,130,246,0.4)' : 'none',
                }} />
              </div>
            </div>
          </div>

          {openEstimates.map((pos, i) => (
            <div key={pos.id}>
              <div
                style={{
                  padding: '12px 0',
                  borderBottom: closingId === pos.id
                    ? 'none'
                    : i < openEstimates.length - 1
                    ? '0.5px solid rgba(255,255,255,0.04)'
                    : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'rgba(255,255,255,0.85)',
                    }}>{pos.shares.toLocaleString()} shares</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      background: 'rgba(59,130,246,0.1)',
                      border: '0.5px solid rgba(59,130,246,0.25)',
                      color: 'rgba(59,130,246,0.8)',
                      letterSpacing: '0.06em',
                    }}>{pos.type ?? 'CONVICTION'}</span>
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.02em',
                  }}>
                    ${pos.entryPrice} entry · {pos.entryDate} · {pos.estimated?.daysHeld ?? 0}d held
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexShrink: 0 }}>
                  {pos.estimated && (
                    <>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '8px',
                          color: 'rgba(255,255,255,0.2)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          marginBottom: '3px',
                        }}>Est. Gross</div>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: pos.estimated.estimatedGross >= 0 ? '#22c55e' : '#ef4444',
                          letterSpacing: '-0.3px',
                        }}>
                          {pos.estimated.estimatedGross >= 0 ? '+' : ''}${Math.round(pos.estimated.estimatedGross).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '8px',
                          color: 'rgba(255,255,255,0.2)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          marginBottom: '3px',
                        }}>Est. Net</div>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: pos.estimated.estimatedNetEur >= 0 ? '#22c55e' : '#ef4444',
                          letterSpacing: '-0.3px',
                        }}>
                          {pos.estimated.estimatedNetEur >= 0 ? '+' : ''}€{Math.round(pos.estimated.estimatedNetEur).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '8px',
                          color: 'rgba(255,255,255,0.2)',
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          marginBottom: '3px',
                        }}>Running Cost</div>
                        <div style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '13px',
                          color: 'rgba(239,68,68,0.7)',
                          letterSpacing: '-0.3px',
                        }}>
                          -${Math.round(pos.estimated.totalCosts).toLocaleString()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setClosingId(pos.id)
                    setExitPrice('')
                    setExitDate(new Date().toISOString().split('T')[0])
                  }}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '9999px',
                    padding: '5px 12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    flexShrink: 0,
                    transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                    e.currentTarget.style.color = 'rgba(239,68,68,0.7)'
                    e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  CLOSE
                </button>
              </div>
              {closingId === pos.id && (
                <div style={{
                  background: '#0d0d18',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
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
                        background: exitPrice && exitDate ? 'rgba(59,130,246,0.1)' : 'transparent',
                        border: `0.5px solid ${exitPrice && exitDate ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        color: exitPrice && exitDate ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.2)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        cursor: exitPrice && exitDate ? 'pointer' : 'not-allowed',
                        letterSpacing: '0.06em',
                        transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {closeLoading ? 'CLOSING...' : 'CONFIRM CLOSE'}
                    </button>
                    <button
                      onClick={() => { setClosingId(null); setExitPrice('') }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '9999px',
                        background: 'transparent',
                        border: '0.5px solid rgba(255,255,255,0.07)',
                        color: 'rgba(255,255,255,0.25)',
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

      {/* PAYOUTS SECTION */}
      <div style={{ marginTop: '24px' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>Payouts</div>

        <div className="payouts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '12px', alignItems: 'start' }}>

          {/* Left — payouts table */}
          <div className="payouts-form-card" style={{
            background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: '18px',
            padding: '20px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            {/* Add payout form */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '5px',
                }}>Amount (EUR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPayoutAmount}
                  onChange={e => setNewPayoutAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'rgba(255,255,255,0.85)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: '5px',
                }}>Date (optional)</label>
                <input
                  type="date"
                  value={newPayoutDate}
                  onChange={e => setNewPayoutDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: newPayoutDate ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                onClick={async () => {
                  if (!newPayoutAmount) return
                  setAddingPayout(true)
                  try {
                    const res = await fetch('/api/payouts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amount: parseFloat(newPayoutAmount),
                        date: newPayoutDate || null,
                      }),
                    })
                    if (res.ok) {
                      const payout = await res.json()
                      setPayouts(p => [payout, ...p])
                      setNewPayoutAmount('')
                      setNewPayoutDate('')
                    }
                  } finally {
                    setAddingPayout(false)
                  }
                }}
                disabled={!newPayoutAmount || addingPayout}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  background: newPayoutAmount ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${newPayoutAmount ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: newPayoutAmount ? 'rgba(59,130,246,0.9)' : 'rgba(255,255,255,0.2)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  cursor: newPayoutAmount ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  alignSelf: 'flex-end',
                  marginBottom: '1px',
                  transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {addingPayout ? 'Adding...' : '+ Add'}
              </button>
            </div>

            {/* Payouts list */}
            {payouts.length === 0 ? (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.2)',
                padding: '12px 0',
                textAlign: 'center',
              }}>No payouts recorded</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Amount', ''].map(col => (
                      <th key={col} style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '6px 10px',
                        textAlign: col === 'Amount' ? 'right' : 'left',
                        fontWeight: '400',
                        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                      <td style={{
                        padding: '10px 10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                        color: payout.date ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                      }}>
                        {payout.date ?? '—'}
                      </td>
                      <td style={{
                        padding: '10px 10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#f0f0f8',
                        textAlign: 'right',
                      }}>
                        €{payout.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            await fetch('/api/payouts', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: payout.id }),
                            })
                            setPayouts(p => p.filter(x => x.id !== payout.id))
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '14px',
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            transition: 'color 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(0)' }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Right — summary card */}
          <div className="payouts-summary-card" style={{
            background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
            border: '0.5px solid rgba(255,255,255,0.07)',
            borderRadius: '18px',
            padding: '20px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>Total Payouts</div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '28px',
                fontWeight: '600',
                color: '#f0f0f8',
                letterSpacing: '-1px',
              }}>€{totalPayouts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)' }}/>

            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>Remaining Balance</div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '28px',
                fontWeight: '600',
                letterSpacing: '-1px',
                color: remaining >= 0 ? '#22c55e' : '#ef4444',
              }}>€{remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.06em',
                marginTop: '4px',
              }}>net profit minus payouts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade log */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '12px',
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Trade Log {!loading && trades.length > 0 && `· ${trades.length} trades`}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectMode && selectedIds.size > 0 && (
            <button onClick={handleBulkSoftDelete} style={{
              padding: '5px 14px', borderRadius: '9999px',
              background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.25)',
              color: 'rgba(239,68,68,0.8)', fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}>Delete {selectedIds.size} selected</button>
          )}
          {selectMode && (
            <button onClick={() => { setSelectMode(false); setSelectedIds(new Set()) }} style={{
              padding: '5px 14px', borderRadius: '9999px',
              background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}>Cancel</button>
          )}
          {!selectMode && (
            <button onClick={() => setSelectMode(true)} style={{
              padding: '5px 14px', borderRadius: '9999px',
              background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}>Select</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{
          height: '200px',
          background: '#13131e',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: '18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <TradeTable
          trades={trades}
          platformFeeMap={platformFeeMap}
          onEdit={openEdit}
          onDelete={handleSoftDelete}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={(id) => setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
          })}
          onToggleAll={(ids) => setSelectedIds(prev =>
            prev.size === ids.length ? new Set() : new Set(ids)
          )}
        />
      )}

      {/* Recently Deleted */}
      {deletedTrades.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div
            onClick={() => setDeletedOpen(v => !v)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', marginBottom: deletedOpen ? '12px' : '0',
              padding: '4px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '9px',
                color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>Recently Deleted · {deletedTrades.length}</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '8px',
                color: 'rgba(239,68,68,0.4)', letterSpacing: '0.1em',
                background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.15)',
                padding: '1px 7px', borderRadius: '9999px',
              }}>recoverable</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {deletedOpen && deletedSelectMode && deletedSelectedIds.size > 0 && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    ;(async () => {
                      for (const id of deletedSelectedIds) await handlePermanentDeleteFromBin(id)
                      setDeletedSelectedIds(new Set())
                      setDeletedSelectMode(false)
                    })()
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: '9999px',
                    background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.25)',
                    color: 'rgba(239,68,68,0.8)', fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >Delete {deletedSelectedIds.size} permanently</button>
              )}
              {deletedOpen && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    if (deletedSelectMode) { setDeletedSelectMode(false); setDeletedSelectedIds(new Set()) }
                    else setDeletedSelectMode(true)
                  }}
                  style={{
                    padding: '4px 12px', borderRadius: '9999px',
                    background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px', cursor: 'pointer', letterSpacing: '0.06em',
                  }}
                >{deletedSelectMode ? 'Cancel' : 'Select'}</button>
              )}
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', userSelect: 'none' }}>
                {deletedOpen ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {deletedOpen && (
            <div style={{
              overflowX: 'auto', borderRadius: '18px',
              border: '0.5px solid rgba(239,68,68,0.12)',
              background: '#13131e',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(239,68,68,0.04)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {deletedSelectMode && (
                      <th style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.065)' }}>
                        <input
                          type="checkbox"
                          checked={deletedSelectedIds.size === deletedTrades.length && deletedTrades.length > 0}
                          onChange={() => setDeletedSelectedIds(prev =>
                            prev.size === deletedTrades.length ? new Set() : new Set(deletedTrades.map(t => t.id))
                          )}
                          style={{ width: 14, height: 14, cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    {['Deleted At', 'Buy Date', 'Sell Date', 'Shares', 'Buy Price', 'Sell Price', 'Net EUR', ''].map(col => (
                      <th key={col} style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '8px 14px', textAlign: col === '' ? 'center' : 'right', fontWeight: '400',
                        borderBottom: '0.5px solid rgba(255,255,255,0.065)', background: 'rgba(255,255,255,0.03)',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deletedTrades.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                      {deletedSelectMode && (
                        <td style={{ padding: '10px 14px' }}>
                          <input
                            type="checkbox"
                            checked={deletedSelectedIds.has(t.id)}
                            onChange={() => setDeletedSelectedIds(prev => {
                              const next = new Set(prev)
                              next.has(t.id) ? next.delete(t.id) : next.add(t.id)
                              return next
                            })}
                            style={{ width: 14, height: 14, cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(239,68,68,0.4)', textAlign: 'right' }}>{t.deleted_at?.slice(0, 10) ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>{t.buy_date}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>{t.sell_date}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{t.shares?.toLocaleString()}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>${t.buy_price?.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>${t.sell_price?.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: '600', color: (t.net_eur ?? 0) >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>{(t.net_eur ?? 0) >= 0 ? '+' : ''}€{Math.abs(t.net_eur ?? 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleRestore(t.id)}
                            style={{
                              padding: '3px 10px', borderRadius: '9999px', fontSize: '9px',
                              fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
                              background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)',
                              color: 'rgba(34,197,94,0.7)', letterSpacing: '0.06em',
                              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                            }}
                          >Restore</button>
                          <button
                            onClick={() => handlePermanentDeleteFromBin(t.id)}
                            style={{
                              padding: '3px 10px', borderRadius: '9999px', fontSize: '9px',
                              fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer',
                              background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.2)',
                              color: 'rgba(239,68,68,0.6)', letterSpacing: '0.06em',
                              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
                            }}
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
        @media (max-width: 899px) {
          .payouts-grid { grid-template-columns: 1fr !important; }
          .payouts-summary-card { order: -1; }
          .payouts-form-card { order: 0; }
        }
      `}</style>
    </div>
  )
}
