'use client'
import { useState, useEffect } from 'react'

export default function PositionMoves({ positions, livePrice, sma200, sma50, rsi, vix, qqq, oilPct, thesis, bucketBCount, bucketCCount }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/position-moves')
      .then(r => r.json())
      .then(d => { if (d.moves?.length) setData(d) })
      .catch(() => {})
  }, [])

  async function handleRefresh() {
    if (!positions?.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/position-moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions,
          livePrice,
          sma200,
          sma50,
          rsi,
          vix,
          qqq,
          oilPct,
          thesis,
          bucketBCount,
          bucketCCount,
        }),
      })
      const d = await res.json()
      if (d.moves) setData(d)
    } catch {}
    finally { setLoading(false) }
  }

  const noPositions = !positions?.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>Position Moves</span>
        <button
          onClick={handleRefresh}
          disabled={loading || noPositions}
          style={{
            background: 'none',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '9999px',
            padding: '3px 8px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px',
            color: loading || noPositions ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
            cursor: loading || noPositions ? 'not-allowed' : 'pointer',
            letterSpacing: '0.08em',
            transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={e => { if (!loading && !noPositions) e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          onMouseLeave={e => { e.currentTarget.style.color = loading || noPositions ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)' }}
        >
          {loading ? 'THINKING...' : 'REFRESH'}
        </button>
      </div>

      {/* Timestamp */}
      {data?.generatedAtET && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '8px',
          color: 'rgba(255,255,255,0.15)',
          marginBottom: '10px',
          letterSpacing: '0.06em',
        }}>
          {data.generatedAtET} ET · ${data.priceAtGeneration?.toFixed(2) ?? '—'}
        </div>
      )}

      {/* No positions state */}
      {noPositions && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.08)',
            border: '0.5px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="rgba(59,130,246,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            No open positions
          </span>
        </div>
      )}

      {/* No data yet but has positions */}
      {!noPositions && !data && !loading && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: '1.5' }}>
            Press Refresh for<br />AI recommendation
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'rgba(59,130,246,0.5)',
                animation: 'jarvisPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Analysing positions...
          </span>
        </div>
      )}

      {/* Moves */}
      {!loading && data?.moves?.map((move, i) => (
        <div key={i} style={{
          padding: '10px 0',
          borderBottom: i < data.moves.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
            }}>
              {move.shares?.toLocaleString()} @ ${move.entryPrice}
              <span style={{
                marginLeft: '6px',
                fontSize: '9px',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: move.type === 'CONVICTION' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                border: `0.5px solid ${move.type === 'CONVICTION' ? 'rgba(59,130,246,0.25)' : 'rgba(245,158,11,0.25)'}`,
                color: move.type === 'CONVICTION' ? 'rgba(59,130,246,0.8)' : 'rgba(245,158,11,0.8)',
              }}>{move.type}</span>
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              fontWeight: '600',
              padding: '2px 10px',
              borderRadius: '9999px',
              background: move.action === 'HOLD' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `0.5px solid ${move.action === 'HOLD' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: move.action === 'HOLD' ? '#22c55e' : '#ef4444',
            }}>{move.action}</span>
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
            lineHeight: '1.4',
          }}>{move.reason}</div>
        </div>
      ))}
    </div>
  )
}
