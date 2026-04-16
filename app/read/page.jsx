'use client'

import { useState, useEffect } from 'react'

function timeAgo(val) {
  const ms   = val > 1e12 ? val : val * 1000
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}

function getSetupColour(type) {
  if (type === 'SCALP')      return '#22c55e'
  if (type === 'CONVICTION') return '#3b82f6'
  if (type === 'WAIT')       return '#f59e0b'
  return 'rgba(255,255,255,0.4)'
}

function getSetupBackground(type) {
  if (type === 'SCALP')      return 'rgba(34,197,94,0.1)'
  if (type === 'CONVICTION') return 'rgba(59,130,246,0.1)'
  if (type === 'WAIT')       return 'rgba(245,158,11,0.1)'
  return 'rgba(255,255,255,0.05)'
}

const ReadCard = ({ eyebrow, accentColour, title, titleSize = '24px', badge, badgeColour, body }) => {
  const leftBorderColour = accentColour.startsWith('#') ? `${accentColour}60` : accentColour
  return (
    <div
      style={{
        background: '#13131e',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: '18px',
        padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        borderLeft: `2px solid ${leftBorderColour}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
      }}
    >
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}>{eyebrow}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {title && (
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: titleSize,
            fontWeight: '600',
            color: accentColour,
            letterSpacing: '-0.5px',
            lineHeight: '1',
          }}>{title}</span>
        )}
        {badge && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10px',
            padding: '3px 8px',
            borderRadius: '9999px',
            background: `${badgeColour}18`,
            border: `0.5px solid ${badgeColour}40`,
            color: badgeColour,
            letterSpacing: '0.06em',
          }}>{badge}</span>
        )}
      </div>

      {body && (
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: '1.6',
          margin: 0,
        }}>{body}</p>
      )}
    </div>
  )
}

export default function ReadPage() {
  const [history,   setHistory]   = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data)
          setActiveIdx(0)
        }
      })
      .catch(() => {})
  }, [])

  async function handleNewRead() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analysis', { method: 'POST' })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      const result = await res.json()
      setHistory(prev => {
        if (prev[0]?.generatedAt === result.generatedAt) return prev
        return [result, ...prev].slice(0, 5)
      })
      setActiveIdx(0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleClearHistory() {
    if (!confirm('Clear all read history?')) return
    await fetch('/api/analysis', { method: 'DELETE' })
    setHistory([])
  }

  const data = history[activeIdx] ?? null

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#08080f',
      fontFamily: 'Inter, sans-serif',
      paddingTop: '56px',
    }}>

      {/* ── Left Sidebar ── */}
      <div
        className="read-sidebar"
        style={{
          width: '220px',
          flexShrink: 0,
          padding: '4px 12px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          height: 'calc(100vh - 56px)',
        }}
      >
        {/* Inner card */}
        <div style={{
          background: '#13131e',
          border: '0.5px solid rgba(255,255,255,0.07)',
          borderRadius: '18px',
          padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
          flex: 1,
          minHeight: 0,
        }}>

          {/* New Read button */}
          <button
            onClick={handleNewRead}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '9999px',
              background: loading ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.12)',
              border: `0.5px solid ${loading ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.3)'}`,
              color: loading ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.9)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
              letterSpacing: '0.01em',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(59,130,246,0.18)'
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.45)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = loading ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.12)'
              e.currentTarget.style.borderColor = loading ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {loading ? 'Reading...' : '+ New Read'}
          </button>

          {/* Divider */}
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

          {/* History header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>History</span>
            <button
              onClick={handleClearHistory}
              style={{
                background: 'none',
                border: '0.5px solid rgba(239,68,68,0.2)',
                borderRadius: '9999px',
                padding: '2px 7px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '8px',
                color: 'rgba(239,68,68,0.4)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'rgba(239,68,68,0.8)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'rgba(239,68,68,0.4)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
              }}
            >
              CLEAR
            </button>
          </div>

          {/* History items — scrollable within the card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
          }}>
            {history.map((item, i) => {
              const setupType = item.setup?.type ?? 'READ'
              const itemTime  = new Date(item.generatedAt).toLocaleTimeString([], {
                hour: '2-digit', minute: '2-digit', hour12: false,
              })
              const itemAgo = timeAgo(item.generatedAt)
              return (
                <div
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: activeIdx === i ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `0.5px solid ${activeIdx === i ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (activeIdx !== i) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeIdx !== i) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      fontWeight: '500',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      background: getSetupBackground(setupType),
                      color: getSetupColour(setupType),
                      letterSpacing: '0.06em',
                    }}>{setupType}</span>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px',
                      color: 'rgba(255,255,255,0.3)',
                    }}>{itemTime}</span>
                  </div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.2)',
                  }}>{itemAgo}</div>
                </div>
              )
            })}

            {history.length === 0 && (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.2)',
                textAlign: 'center',
                padding: '16px 0',
              }}>No reads yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div
        className="read-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Mobile New Read button — hidden on desktop, shown via CSS on mobile */}
        <button
          className="read-mobile-btn"
          onClick={handleNewRead}
          disabled={loading}
          style={{
            display: 'none',
            width: '100%',
            padding: '12px',
            borderRadius: '9999px',
            background: 'rgba(59,130,246,0.12)',
            border: '0.5px solid rgba(59,130,246,0.3)',
            color: loading ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.9)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '0',
          }}
        >
          {loading ? 'Reading...' : '+ New Read'}
        </button>

        {/* Empty state */}
        {!loading && history.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            gap: '12px',
          }}>
            <div style={{
              width: '48px', height: '48px',
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.08)',
              border: '0.5px solid rgba(59,130,246,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="rgba(59,130,246,0.6)" strokeWidth="1.5" />
                <path d="m21 21-4.35-4.35" stroke="rgba(59,130,246,0.6)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.3)',
            }}>Press New Read to analyse current conditions</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            gap: '8px',
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px',
                borderRadius: '50%',
                background: 'rgba(59,130,246,0.6)',
                animation: 'jarvisPulse 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            borderRadius: '16px',
            border: '1px solid rgba(220,38,38,0.2)',
            background: 'rgba(239,68,68,0.05)',
            padding: '20px 24px',
          }}>
            <p style={{ fontSize: '14px', color: '#f87171', fontFamily: 'monospace' }}>{error}</p>
          </div>
        )}

        {/* Read output */}
        {data && !loading && (() => {
          const dirColors = {
            RESOLVING: '#22c55e',
            WORSENING: '#ef4444',
            STABLE:    '#f59e0b',
            UNKNOWN:   'rgba(255,255,255,0.4)',
          }
          const confColors = {
            HIGH:   '#22c55e',
            MEDIUM: '#f59e0b',
            LOW:    'rgba(255,255,255,0.4)',
          }

          const allNews        = data.classifiedNews ?? []
          const highImpactNews = allNews
            .filter(a => a.bucket === 'B' || a.bucket === 'C')
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            .slice(0, 6)

          const newsTitle = highImpactNews.length > 0 ? 'High impact news' : 'No high impact news'
          const newsBody  = highImpactNews.length === 0
            ? 'No significant news to act on.'
            : highImpactNews.map(a => a.headline).join(' · ')

          return (
            <>
              {/* Timestamp */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.08em',
              }}>
                {new Date(data.generatedAt).toLocaleTimeString([], {
                  hour: '2-digit', minute: '2-digit', hour12: false,
                })} · {timeAgo(data.generatedAt)}
              </div>

              {/* Legacy format notice */}
              {!data.setup && data.recommendedAction && (
                <div style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '20px 24px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '13px', color: '#4b5563', fontFamily: 'monospace' }}>
                    Legacy format — run a new read to see the updated analysis
                  </p>
                </div>
              )}

              {/* 2x2 grid */}
              {data.setup && (
                <div
                  className="read-grid"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                >
                  {/* Card 1 — Setup */}
                  <ReadCard
                    eyebrow="Setup"
                    accentColour={getSetupColour(data.setup?.type)}
                    title={data.setup?.type}
                    titleSize="32px"
                    badge={data.setup?.confidence}
                    badgeColour={confColors[data.setup?.confidence] ?? 'rgba(255,255,255,0.4)'}
                    body={data.setup?.reason}
                  />

                  {/* Card 2 — Why Is It Here */}
                  <ReadCard
                    eyebrow="Why Is It Here"
                    accentColour="#f59e0b"
                    title={data.whyHere?.cause}
                    badge={data.whyHere?.alreadyPriced ? 'Already priced in' : 'Not priced in'}
                    badgeColour="rgba(255,255,255,0.3)"
                    body={data.whyHere?.explanation}
                  />

                  {/* Card 3 — Is It Resolving */}
                  <ReadCard
                    eyebrow="Is It Resolving"
                    accentColour={dirColors[data.resolution?.direction] ?? '#3b82f6'}
                    title={data.resolution?.direction}
                    badge={data.resolution?.speed}
                    badgeColour="rgba(255,255,255,0.3)"
                    body={data.resolution?.catalyst}
                  />

                  {/* Card 4 — Today's News */}
                  <ReadCard
                    eyebrow="Today's News"
                    accentColour="rgba(255,255,255,0.15)"
                    title={newsTitle}
                    badge={data.newsToday?.alreadyPriced?.length > 0 ? 'Priced in' : null}
                    badgeColour="rgba(255,255,255,0.3)"
                    body={newsBody}
                  />
                </div>
              )}

              {/* Trade card — full width below grid */}
              {data.trade && (data.trade.type === 'SCALP' || data.trade.type === 'CONVICTION') && (
                <div style={{
                  background: '#13131e',
                  border: '0.5px solid rgba(59,130,246,0.15)',
                  borderRadius: '18px',
                  padding: '20px 24px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(59,130,246,0.08)',
                  borderLeft: '2px solid rgba(59,130,246,0.4)',
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    color: 'rgba(59,130,246,0.6)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '12px',
                  }}>Trade Setup</span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Thesis</div>
                      <div style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{data.trade?.thesis}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Invalidated If</div>
                      <div style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(239,68,68,0.7)', lineHeight: '1.5' }}>{data.trade?.invalidatedIf}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Entry Zone</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#22c55e' }}>{data.trade?.entryZone}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Type</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#3b82f6' }}>{data.trade?.type}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <a
                      href="/trade"
                      style={{ flex: 1, padding: '11px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    >
                      Trade Checklist
                    </a>
                    <a
                      href="/track"
                      style={{ flex: 1, padding: '11px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.05em', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    >
                      Log Position
                    </a>
                  </div>
                </div>
              )}

              {/* Position Commentary — only if AI returned commentary for open positions */}
              {data.positionCommentary?.length > 0 && (
                <div style={{
                  background: '#13131e',
                  border: '0.5px solid rgba(245,158,11,0.15)',
                  borderRadius: '18px',
                  padding: '20px 24px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(245,158,11,0.06)',
                  borderLeft: '2px solid rgba(245,158,11,0.4)',
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    color: 'rgba(245,158,11,0.6)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '12px',
                  }}>Your Positions</span>

                  {data.positionCommentary.map((comment, i) => (
                    <div key={i} style={{
                      padding: '12px 0',
                      borderBottom: i < data.positionCommentary.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                          {comment.shares} shares @ ${comment.entry}
                        </span>
                        <span style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: comment.recommendation === 'HOLD' ? 'rgba(59,130,246,0.1)' : comment.recommendation === 'EXIT' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                          color: comment.recommendation === 'HOLD' ? '#3b82f6' : comment.recommendation === 'EXIT' ? '#ef4444' : '#22c55e',
                          border: `0.5px solid ${comment.recommendation === 'HOLD' ? 'rgba(59,130,246,0.25)' : comment.recommendation === 'EXIT' ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
                        }}>{comment.recommendation}</span>
                      </div>
                      <div style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>
                        {comment.reasoning}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
