'use client'
import { useState, useEffect, useCallback } from 'react'
import SummaryCards from '@/components/Track/SummaryCards'
import TradeTable   from '@/components/Track/TradeTable'
import TradeForm    from '@/components/Track/TradeForm'

export default function TrackPage() {
  const [trades,    setTrades]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [formOpen,  setFormOpen]  = useState(false)
  const [editTrade, setEditTrade] = useState(null)   // null = add mode, trade object = edit mode

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

  useEffect(() => { fetchTrades() }, [fetchTrades])

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080910',
      padding: '28px 24px',
      maxWidth: '1400px',
      margin: '0 auto',
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
          <SummaryCards trades={trades} />
        )}
      </div>

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
