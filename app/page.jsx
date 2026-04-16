'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNVDAData }     from '@/hooks/useNVDAData'
import { useMacroData }    from '@/hooks/useMacroData'
import { useNews }         from '@/hooks/useNews'
import { useFundamentals } from '@/hooks/useFundamentals'
import { useAlerts }       from '@/hooks/useAlerts'
import { useNVDALive }     from '@/context/NVDALiveContext'
import { getThesisStatus } from '@/lib/thesisEngine'
import { getMarketSession } from '@/lib/sessionUtils'

import ThesisStatus  from '@/components/Dashboard/ThesisStatus'
import PositionPanel from '@/components/Dashboard/PositionPanel'

// ── Design tokens ──────────────────────────────────────────────────────────
const CARD = {
  background: '#13131e',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '18px',
  padding: '20px 24px',
  position: 'relative',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
}

const HEADER_CARD = {
  ...CARD,
  padding: '16px 20px',
}

const EYE = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.25)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  marginBottom: '14px',
  display: 'block',
}

function cardIn(e) {
  e.currentTarget.style.border    = '0.5px solid rgba(255,255,255,0.12)'
  e.currentTarget.style.transform = 'translateY(-2px)'
  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
}
function cardOut(e) {
  e.currentTarget.style.border    = '0.5px solid rgba(255,255,255,0.07)'
  e.currentTarget.style.transform = 'translateY(0)'
  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
}

// ── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function sessionInfo(session) {
  switch (session) {
    case 'open':       return { label: 'LIVE',        badgeLabel: 'MARKET OPEN',  isLive: true,  colour: '#22c55e' }
    case 'premarket':  return { label: 'PRE-MARKET',  badgeLabel: 'PRE-MARKET',   isLive: false, colour: '#f59e0b' }
    case 'afterhours': return { label: 'AFTER HOURS', badgeLabel: 'AFTER HOURS',  isLive: false, colour: '#f59e0b' }
    default:           return { label: 'CLOSED',      badgeLabel: 'MARKET CLOSED',isLive: false, colour: 'rgba(255,255,255,0.4)' }
  }
}

// ── DataRow — used in Technicals card ─────────────────────────────────────
function DataRow({ label, value, badge, badgeColour, dimmed, last }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        color: dimmed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
      }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {value && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: dimmed ? 'rgba(255,255,255,0.3)' : '#f0f0f8',
          }}>{value}</span>
        )}
        {badge && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '9999px',
            background: `${badgeColour}18`,
            border: `0.5px solid ${badgeColour}40`,
            color: badgeColour,
          }}>{badge}</span>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: priceData, loading: priceLoading }  = useNVDAData()
  const { data: macroData }                          = useMacroData()
  const { articles }                                 = useNews()
  const { data: fundamentalsData }                   = useFundamentals()
  const { livePrice, wsConnected }                   = useNVDALive()
  useAlerts({ externalPriceData: priceData, externalMacroData: macroData })

  // Positions + Iran (KV-backed)
  const [positions,  setPositions]  = useState([])
  const [iranStatus, setIranStatus] = useState('ESCALATING')

  // TODO: Replace manual iranStatus with AI-calculated status from news — see DESIGN.md

  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(d => {
        setPositions(d.positions || [])
        setIranStatus(d.iranStatus || 'ESCALATING')
      })
      .catch(() => {})
  }, [])

  // Calendar (AI-generated, cached 1h in Redis)
  const [calendarData,    setCalendarData]    = useState(null)
  const [calendarLoading, setCalendarLoading] = useState(false)

  const fetchCalendar = useCallback(async (force = false) => {
    setCalendarLoading(true)
    try {
      const res  = await fetch('/api/calendar', { method: force ? 'POST' : 'GET' })
      const data = await res.json()
      setCalendarData(data)
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  useEffect(() => { fetchCalendar() }, [fetchCalendar])

  // Position CRUD
  const handleAddPosition = useCallback(async (pos) => {
    const res  = await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', payload: pos }),
    })
    const data = await res.json()
    setPositions(data.positions || [])
  }, [])

  const handleRemovePosition = useCallback(async (id) => {
    const res  = await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', payload: { id } }),
    })
    const data = await res.json()
    setPositions(data.positions || [])
  }, [])

  // ── Derived values ─────────────────────────────────────────────────────
  const displayPrice   = livePrice ?? priceData?.price ?? null
  const price          = priceData?.price   ?? null
  const prevClose      = priceData?.prevClose ?? null
  const pctChange      = priceData?.pctChange ?? null
  const sma200         = priceData?.sma200  ?? null
  const sma50          = priceData?.sma50   ?? null
  const pctFrom200     = priceData?.pctFrom200 ?? null
  const pctFrom50      = priceData?.pctFrom50  ?? null
  const vix            = macroData?.vix?.level ?? 0
  const oilTwo         = macroData?.oil?.twoSessionPct ?? 0
  const oilPrice       = macroData?.oil?.price ?? null
  const oilPct         = macroData?.oil?.pctChange ?? null
  const qqq            = macroData?.qqq?.pctChange ?? 0
  const analystTarget  = fundamentalsData?.analystTarget ?? null
  const analystPctDiff = (analystTarget && price) ? ((analystTarget - price) / price) * 100 : null

  const nowSec         = Date.now() / 1000
  const hasBucketCNews = articles.some(a => a.bucket === 'C' && (nowSec - a.datetime) < 86400)

  const thesis         = getThesisStatus({ price, sma200, oilTwoSessionPct: oilTwo, vix, hasBucketCNews })

  const bucketBNews    = articles.filter(a => a.bucket === 'B')
  const bucketCNews    = articles.filter(a => a.bucket === 'C')

  // Session
  const session        = getMarketSession()
  const sess           = sessionInfo(session)
  const isLive         = sess.isLive

  // Oil change badge string
  const oilChange      = oilPct != null ? `${oilPct >= 0 ? '+' : ''}${oilPct.toFixed(2)}%` : null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080f',
      padding: '88px 28px 40px', // 88 = 68px nav + 20px breathing room
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '-68px',
    }}>

      {/* ── ROW 1 — THREE COMPACT HEADER CARDS ───────────────────────────── */}
      <div className="dashboard-row" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
      }}>

        {/* Card 1 — Price */}
        <div style={HEADER_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          {/* Session badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '9999px',
            background: isLive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${isLive ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`,
            marginBottom: '10px',
          }}>
            <div style={{
              width: '5px', height: '5px',
              borderRadius: '50%',
              background: isLive ? '#22c55e' : 'rgba(255,255,255,0.3)',
              boxShadow: isLive ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
              animation: isLive ? 'pulse 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: isLive ? '#22c55e' : 'rgba(255,255,255,0.4)',
              letterSpacing: '0.08em',
            }}>{sess.label}</span>
          </div>

          {/* Hero price */}
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '48px',
            fontWeight: '600',
            color: '#f0f0f8',
            letterSpacing: '-2px',
            lineHeight: '1',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontWeight: '300', fontSize: '32px', verticalAlign: 'top', marginTop: '8px', display: 'inline-block' }}>$</span>
            {displayPrice != null ? displayPrice.toFixed(2) : '—'}
          </div>

          {/* % change badge */}
          {pctChange != null && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '9999px',
              background: pctChange >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `0.5px solid ${pctChange >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              marginTop: '8px',
            }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                color: pctChange >= 0 ? '#22c55e' : '#ef4444',
              }}>{pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%</span>
            </div>
          )}
        </div>

        {/* Card 2 — Thesis Status */}
        <div style={HEADER_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>Thesis</span>
          <ThesisStatus
            status={thesis.status}
            triggers={thesis.triggers}
            style={{ background: 'transparent', border: 'none', padding: 0, borderRadius: '0 0 14px 14px' }}
          />
        </div>

        {/* Card 3 — Market Status */}
        <div style={HEADER_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>Market</span>

          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            fontWeight: '500',
            color: sess.colour,
            marginBottom: '12px',
            letterSpacing: '-0.3px',
          }}>{sess.badgeLabel}</div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', marginBottom: '12px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Yesterday
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              {prevClose != null ? `$${prevClose.toFixed(2)}` : '—'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              vs yesterday
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '14px',
              fontWeight: '500',
              color: pctChange == null ? 'rgba(255,255,255,0.3)' : pctChange >= 0 ? '#22c55e' : '#ef4444',
            }}>
              {pctChange != null ? `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── ROW 2 — THREE TALL CONTENT CARDS ─────────────────────────────── */}
      <div className="dashboard-row" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        alignItems: 'stretch',
      }}>

        {/* Card 1 — Technicals */}
        <div style={{ ...CARD, minHeight: '320px' }} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>Technicals</span>

          <DataRow
            label="200 SMA"
            value={sma200 != null ? `$${sma200.toFixed(2)}` : '—'}
            badge={pctFrom200 != null ? `${pctFrom200 >= 0 ? '+' : ''}${pctFrom200.toFixed(1)}%` : null}
            badgeColour={pctFrom200 != null ? (pctFrom200 < 0 ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.2)'}
          />
          <DataRow
            label="50 SMA"
            value={sma50 != null ? `$${sma50.toFixed(2)}` : '—'}
            badge={pctFrom50 != null ? `${pctFrom50 >= 0 ? '+' : ''}${pctFrom50.toFixed(1)}%` : null}
            badgeColour={pctFrom50 != null ? (pctFrom50 < 0 ? '#22c55e' : '#f59e0b') : 'rgba(255,255,255,0.2)'}
          />
          <DataRow
            label="RSI"
            badge="Soon"
            badgeColour="rgba(255,255,255,0.15)"
            dimmed
          />
          <DataRow
            label="QQQ"
            badge={qqq != null ? `${qqq >= 0 ? '+' : ''}${qqq.toFixed(2)}%` : null}
            badgeColour={qqq >= 0 ? '#22c55e' : '#ef4444'}
          />
          <DataRow
            label="VIX"
            value={vix ? vix.toFixed(1) : '—'}
            badge={vix ? (vix < 20 ? 'LOW' : vix < 30 ? 'ELEVATED' : 'HIGH') : null}
            badgeColour={vix < 20 ? '#22c55e' : vix < 30 ? '#f59e0b' : '#ef4444'}
          />
          <DataRow
            label="Brent Crude"
            value={oilPrice != null ? `$${oilPrice.toFixed(1)}` : '—'}
            badge={oilChange}
            badgeColour={oilPct != null ? (oilPct <= 0 ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.2)'}
          />
          <DataRow
            label="Analyst Target"
            value={analystTarget != null ? `$${analystTarget}` : '—'}
            badge={analystPctDiff != null ? `+${analystPctDiff.toFixed(1)}%` : null}
            badgeColour="#3b82f6"
            last
          />
        </div>

        {/* Card 2 — News Feed (Bucket B / C) */}
        <div style={{ ...CARD, minHeight: '320px' }} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>News Feed</span>

          {/* Supporting — Bucket B */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '8px',
              color: 'rgba(34,197,94,0.6)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>Supporting</div>

            {bucketBNews.slice(0, 5).map((article, i) => (
              <div key={article.id ?? i} style={{
                padding: '6px 0',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: '1.4',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>{article.headline}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.32)',
                }}>{article.source} · {timeAgo(article.datetime)}</div>
              </div>
            ))}

            {bucketBNews.length === 0 && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)', padding: '6px 0' }}>
                No supporting signals
              </div>
            )}
          </div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

          {/* Risk — Bucket C */}
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '8px',
              color: 'rgba(239,68,68,0.6)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>Risk</div>

            {bucketCNews.slice(0, 5).map((article, i) => (
              <div key={article.id ?? i} style={{
                padding: '6px 0',
                borderBottom: '0.5px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: '1.4',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>{article.headline}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.32)',
                }}>{article.source} · {timeAgo(article.datetime)}</div>
              </div>
            ))}

            {bucketCNews.length === 0 && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.2)', padding: '6px 0' }}>
                No risk signals
              </div>
            )}
          </div>
        </div>

        {/* Card 3 — Things To Watch (AI calendar + Iran read-only) */}
        <div style={{ ...CARD, minHeight: '320px' }} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ ...EYE, marginBottom: 0 }}>Things To Watch</span>
            <button
              onClick={() => fetchCalendar(true)}
              disabled={calendarLoading}
              style={{
                background: 'none',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '9999px',
                padding: '3px 8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '9px',
                color: calendarLoading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)',
                cursor: calendarLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              {calendarLoading ? 'LOADING' : 'REFRESH'}
            </button>
          </div>

          {calendarData?.updatedAt && (
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '8px',
              color: 'rgba(255,255,255,0.15)',
              marginBottom: '10px',
              letterSpacing: '0.06em',
            }}>
              Updated {new Date(calendarData.updatedAt).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York',
              })} ET
            </div>
          )}

          {calendarLoading && !calendarData && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>
              Loading events...
            </div>
          )}

          {(!calendarData?.events || calendarData.events.length === 0) && !calendarLoading && (
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.2)',
              padding: '12px 0',
              textAlign: 'center',
            }}>
              No upcoming events found — try refreshing
            </div>
          )}

          {calendarData?.events?.map((event, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: '0.5px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                <span style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: event.impact === 'high' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
                }}>{event.title}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  color: event.daysAway <= 7 ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}>{event.daysAway}d</span>
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.25)',
                lineHeight: '1.4',
              }}>{event.note}</div>
            </div>
          ))}

          {/* Iran / Hormuz — read-only status */}
          <div style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '0.5px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>Iran / Hormuz</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: iranStatus === 'WAR'
                ? 'rgba(239,68,68,0.1)'
                : iranStatus === 'ESCALATING'
                ? 'rgba(245,158,11,0.1)'
                : 'rgba(34,197,94,0.1)',
              border: `0.5px solid ${
                iranStatus === 'WAR'
                  ? 'rgba(239,68,68,0.3)'
                  : iranStatus === 'ESCALATING'
                  ? 'rgba(245,158,11,0.3)'
                  : 'rgba(34,197,94,0.3)'
              }`,
              color: iranStatus === 'WAR' ? '#ef4444' : iranStatus === 'ESCALATING' ? '#f59e0b' : '#22c55e',
            }}>{iranStatus ?? 'UNKNOWN'}</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3 — THREE EQUAL CARDS ─────────────────────────────────────── */}
      <div className="dashboard-row" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
      }}>

        {/* Card 1 — Positions */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>Positions</span>
          <PositionPanel
            positions={positions}
            currentPrice={displayPrice}
            onAdd={handleAddPosition}
            onRemove={handleRemovePosition}
          />
        </div>

        {/* Card 2 — Position Moves (placeholder) */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '10px' }} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={{ ...EYE, marginBottom: 0 }}>Position Moves</span>
          <div style={{
            width: '40px', height: '40px',
            borderRadius: '50%',
            background: 'rgba(59,130,246,0.08)',
            border: '0.5px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M5 12l7-7 7 7" stroke="rgba(59,130,246,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            lineHeight: '1.5',
          }}>AI position recommendations<br />coming soon</span>
        </div>

        {/* Card 3 — Jarvis Talk (placeholder) */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '12px' }} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={{ ...EYE, marginBottom: 0 }}>Jarvis</span>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '64px', height: '64px',
              borderRadius: '50%',
              border: '1px solid rgba(59,130,246,0.15)',
              animation: 'jarvisPulse 2.5s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute',
              width: '52px', height: '52px',
              borderRadius: '50%',
              border: '1px solid rgba(59,130,246,0.1)',
              animation: 'jarvisPulse 2.5s ease-in-out infinite 0.4s',
            }} />
            <div style={{
              width: '44px', height: '44px',
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.1)',
              border: '0.5px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="rgba(59,130,246,0.7)" />
                <path d="M5 10a7 7 0 0014 0" stroke="rgba(59,130,246,0.7)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(59,130,246,0.7)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.2)',
          }}>Talk to Jarvis</span>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .dashboard-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
