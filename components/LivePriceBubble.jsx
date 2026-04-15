'use client'
import { useState, useEffect, useRef } from 'react'
import { getMarketSession, getCountdown } from '@/lib/sessionUtils'

const SESSION_CONFIG = {
  open:       { bg: 'rgba(52,211,153,0.12)',  text: '#34d399', label: 'LIVE'        },
  premarket:  { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24', label: 'PRE-MARKET'  },
  afterhours: { bg: 'rgba(91,156,246,0.12)',  text: '#5b9cf6', label: 'AFTER HOURS' },
  closed:     { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8', label: 'CLOSED'      },
}

const COUNTDOWN_LABEL = {
  open:       'Market closes in',
  premarket:  'Market opens in',
  afterhours: 'Extended hours close in',
  closed:     'Pre-market opens in',
}

export default function LivePriceBubble({ livePrice, prevClose, pctChange, wsConnected, marketOpen }) {
  const [session,    setSession]    = useState(() => getMarketSession())
  const [countdown,  setCountdown]  = useState(() => getCountdown(getMarketSession()))
  const [flashClass, setFlashClass] = useState('')
  const prevPriceRef = useRef(null)

  // Session + countdown: update every second
  useEffect(() => {
    function tick() {
      const raw       = getMarketSession()
      const effective = (marketOpen === false && raw === 'open') ? 'closed' : raw
      setSession(effective)
      setCountdown(getCountdown(effective))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [marketOpen])

  // Price flash on tick
  useEffect(() => {
    if (livePrice == null) return
    if (prevPriceRef.current == null) {
      prevPriceRef.current = livePrice
      return
    }
    if (livePrice === prevPriceRef.current) return

    const cls = livePrice > prevPriceRef.current ? 'lpb-flash-up' : 'lpb-flash-down'
    setFlashClass(cls)
    prevPriceRef.current = livePrice
    const t = setTimeout(() => setFlashClass(''), 300)
    return () => clearTimeout(t)
  }, [livePrice])

  const cfg = SESSION_CONFIG[session]

  // Displayed price: closed shows prevClose only; other sessions prefer live tick
  const displayPrice = session === 'closed'
    ? prevClose
    : (livePrice ?? prevClose)

  // % change: closed uses REST pctChange; others compute live from prevClose
  const displayPct = session === 'closed'
    ? pctChange
    : (prevClose && displayPrice != null ? (displayPrice - prevClose) / prevClose * 100 : pctChange)

  const isUp = (displayPct ?? 0) >= 0

  const countdownText = countdown
    ? `${countdown.h > 0 ? `${countdown.h}h ` : ''}${countdown.m}m`
    : null

  return (
    <div style={{
      background:   '#0f1117',
      border:       '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px',
      padding:      '14px 18px',
    }}>
      {/* Row 1: badge · dot · countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{
          padding: '3px 10px', borderRadius: '20px',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
          fontFamily: 'Inter, sans-serif',
          background: cfg.bg, color: cfg.text,
        }}>
          {cfg.label}
        </span>

        {wsConnected && session !== 'closed' && (
          <div className="lpb-dot" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#34d399', boxShadow: '0 0 6px #34d399',
          }} />
        )}

        {countdownText && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px', color: '#3d4a5c',
            fontFamily: 'Inter, sans-serif',
          }}>
            {COUNTDOWN_LABEL[session]} {countdownText}
          </span>
        )}
      </div>

      {/* Row 2: price */}
      <div
        className={flashClass}
        style={{
          fontFamily:    "'Inter Tight', monospace",
          fontSize:      'clamp(32px, 5vw, 42px)',
          fontWeight:    600,
          letterSpacing: '-1.5px',
          color:         '#eef2ff',
          lineHeight:    1,
          marginBottom:  '8px',
        }}
      >
        {displayPrice != null ? `$${displayPrice.toFixed(2)}` : '—'}
      </div>

      {/* Row 3: % change */}
      {displayPct != null && (
        <span style={{
          fontFamily:   "'Inter Tight', sans-serif",
          fontSize:     '13px',
          fontWeight:   500,
          padding:      '3px 10px',
          borderRadius: '8px',
          color:        isUp ? '#34d399' : '#f87171',
          background:   isUp ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
        }}>
          {isUp ? '▲' : '▼'} {Math.abs(displayPct).toFixed(2)}%
        </span>
      )}

      {/* Premarket note */}
      {session === 'premarket' && (
        <div style={{
          fontSize: '10px', color: '#3d4a5c',
          marginTop: '8px', fontFamily: 'Inter, sans-serif',
        }}>
          Low liquidity — spreads wider than market hours
        </div>
      )}
    </div>
  )
}
