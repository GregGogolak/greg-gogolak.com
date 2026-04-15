'use client'

import { useState, useEffect } from 'react'

// Full static strings — Tailwind scanner requires no dynamic class construction
const ACTION_TAB = {
  BUY:        'border-emerald-700 text-emerald-400 bg-emerald-500/10',
  WAIT:       'border-amber-700   text-amber-400   bg-amber-500/10',
  HOLD:       'border-blue-700    text-blue-400    bg-blue-500/10',
  AVOID:      'border-red-700     text-red-400     bg-red-500/10',
  SCALP:      'border-emerald-700 text-emerald-400 bg-emerald-500/10',
  CONVICTION: 'border-blue-700    text-blue-400    bg-blue-500/10',
  'NO SETUP': 'border-gray-700    text-gray-500    bg-gray-500/10',
}

function getTabLabel(read) {
  // New format uses setup.type; fall back to old recommendedAction for cached reads
  const action = read.setup?.type ?? read.recommendedAction?.action ?? '??'
  const time   = new Date(read.generatedAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return { action, time }
}

function timeAgo(val) {
  const ms   = val > 1e12 ? val : val * 1000
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} min ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function ReadPage() {
  const [history,     setHistory]     = useState([])
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  function switchTab(idx) {
    setActiveIdx(idx)
    setSidebarOpen(false)
  }

  const data = history[activeIdx] ?? null

  return (
    /*
     * position:fixed + inset:0 + bottom:52px fills the viewport above the nav bar
     * regardless of body padding. This is the only reliable way to get a
     * full-screen two-panel layout with a fixed bottom nav.
     */
    <div
      className="flex bg-[#0a0a0a] text-[#eef2ff]"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >

      {/* Mobile backdrop — tap outside to close */}
      {sidebarOpen && (
        <div
          className="md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }}
        />
      )}

      {/* ── Left Sidebar ── */}
      {/*
        Mobile:  position:fixed overlay, slides in/out via translateX, height fills above nav
        Desktop: normal flex-row item (md:relative resets fixed, md:translate-x-0 keeps visible)
      */}
      <aside
        className={`
          flex flex-col shrink-0
          fixed top-0 left-[90px] z-50 h-screen
          transition-transform duration-[220ms] ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:h-auto md:z-auto md:translate-x-0 md:left-0
        `}
        style={{ width: 280, background: '#0d0d0d', borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Header */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.15em', marginBottom: 16 }}>GIVE ME A READ</p>

          {/* New Read button */}
          <button
            onClick={handleNewRead}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: 14,
              fontSize: 13,
              fontFamily: 'monospace',
              fontWeight: 600,
              letterSpacing: '0.06em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              ...(loading
                ? { border: '1px solid rgba(59,130,246,0.4)', color: '#60a5fa', background: 'rgba(59,130,246,0.08)' }
                : { border: '1px solid rgba(255,255,255,0.13)', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)' }
              ),
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)' }}}
          >
            {loading ? (
              <>
                <span style={{ opacity: 0.7 }}>◌</span>
                ANALYSING…
              </>
            ) : (
              <>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                NEW READ
              </>
            )}
          </button>
        </div>

        {/* History list */}
        <div
          className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <p style={{ padding: '16px 20px 8px', fontSize: 10, fontFamily: 'monospace', color: '#374151', letterSpacing: '0.12em' }}>
            HISTORY
          </p>

          {history.length === 0 ? (
            <div style={{ padding: '12px 20px 24px' }}>
              <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                No reads yet. Hit <span style={{ color: '#4b5563' }}>NEW READ</span> to get started.
              </p>
            </div>
          ) : (
            history.map((read, i) => {
              const { action, time } = getTabLabel(read)
              const isActive = i === activeIdx
              const actionColors = {
                BUY:        { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  text: '#34d399', badge: 'rgba(16,185,129,0.15)' },
                WAIT:       { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  text: '#fbbf24', badge: 'rgba(245,158,11,0.15)' },
                HOLD:       { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  text: '#60a5fa', badge: 'rgba(59,130,246,0.15)' },
                AVOID:      { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   text: '#f87171', badge: 'rgba(239,68,68,0.15)' },
                SCALP:      { border: '#10b981', bg: 'rgba(16,185,129,0.08)',  text: '#34d399', badge: 'rgba(16,185,129,0.15)' },
                CONVICTION: { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  text: '#60a5fa', badge: 'rgba(59,130,246,0.15)' },
                'NO SETUP': { border: '#6b7280', bg: 'rgba(107,114,128,0.06)', text: '#9ca3af', badge: 'rgba(107,114,128,0.12)' },
              }
              const c = actionColors[action] ?? { border: '#6b7280', bg: 'rgba(255,255,255,0.04)', text: '#9ca3af', badge: 'rgba(255,255,255,0.08)' }
              return (
                <button
                  key={`${read.generatedAt}-${i}`}
                  onClick={() => switchTab(i)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    borderLeft: `3px solid ${isActive ? c.border : 'transparent'}`,
                    background: isActive ? c.bg : 'transparent',
                    borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {/* Action badge */}
                    <span style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: isActive ? c.text : '#6b7280',
                      background: isActive ? c.badge : 'rgba(255,255,255,0.05)',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      {action}
                    </span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#4b5563' }}>{time}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#374151', marginLeft: 2 }}>{timeAgo(read.generatedAt)}</p>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile: top bar with hamburger + tabs (shown only below md) */}
        <div
          className="md:hidden flex items-center gap-2 overflow-x-auto px-3 py-3 border-b border-white/[0.07] shrink-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.09)',
              background: sidebarOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: sidebarOpen ? '#e5e7eb' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Toggle history"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>

          <button
            onClick={handleNewRead}
            disabled={loading}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-mono tracking-wide border transition-colors disabled:cursor-not-allowed ${
              loading
                ? 'border-blue-700/60 text-blue-400 bg-blue-500/10'
                : 'border-white/[0.07] text-gray-500 hover:border-blue-700/50 hover:text-blue-400'
            }`}
          >
            {loading ? 'ANALYSING…' : '+ NEW READ'}
          </button>
          {history.map((read, i) => {
            const { action, time } = getTabLabel(read)
            const isActive = i === activeIdx
            return (
              <button
                key={`${read.generatedAt}-${i}`}
                onClick={() => switchTab(i)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-mono tracking-wide border transition-colors ${
                  isActive && ACTION_TAB[action]
                    ? ACTION_TAB[action]
                    : 'border-white/[0.07] text-gray-600 hover:border-white/10 hover:text-gray-500'
                }`}
              >
                {action} {time}
              </button>
            )
          })}
        </div>

        {/* Scrollable content — flex column + align-items:center centres the inner column */}
        <div
          className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Empty state — vertically centred in the available space */}
          {!loading && history.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.07)', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#6b7280', fontSize: 24, fontFamily: 'monospace' }}>J</span>
              </div>
              <div>
                <p style={{ fontSize: 16, fontFamily: 'monospace', color: '#9ca3af', marginBottom: 8 }}>Jarvis is ready</p>
                <p style={{ fontSize: 14, color: '#4b5563', maxWidth: 320, lineHeight: 1.6 }}>
                  Request a read for an AI-powered assessment of NVDA's current position
                </p>
              </div>
              <button
                onClick={handleNewRead}
                style={{ marginTop: 8, padding: '12px 28px', borderRadius: 12, fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.09)', color: '#9ca3af', background: 'transparent', cursor: 'pointer' }}
              >
                + NEW READ
              </button>
            </div>
          )}

          {/* Content column — fixed max-width, centred */}
          {(loading || (data && !loading)) && (
            <div style={{ width: '100%', maxWidth: 760, padding: '40px 32px' }}>

              {error && (
                <div style={{ borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(239,68,68,0.05)', padding: '20px 24px', marginBottom: 20 }}>
                  <p style={{ fontSize: 14, color: '#f87171', fontFamily: 'monospace' }}>{error}</p>
                </div>
              )}

              {/* Shimmer skeleton */}
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {[2, 3, 3, 2, 2].map((lines, i) => (
                    <div key={i} style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #374151', background: 'rgba(255,255,255,0.02)', padding: '28px 32px' }}>
                      <div className="animate-pulse" style={{ height: 8, width: 112, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />
                      {Array.from({ length: lines }).map((_, j) => (
                        <div
                          key={j}
                          className="animate-pulse"
                          style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: j < lines - 1 ? 12 : 0, width: j === 0 ? '88%' : j === lines - 1 ? '52%' : '70%' }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Content cards */}
              {data && !loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#4b5563', textAlign: 'center', paddingBottom: 8 }}>
                    {Date.now() - data.generatedAt < 60_000
                      ? 'fresh read'
                      : `${new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · ${timeAgo(data.generatedAt)}`}
                  </p>

                  {/* Legacy format notice */}
                  {!data.setup && data.recommendedAction && (
                    <div style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: '20px 24px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: '#4b5563', fontFamily: 'monospace' }}>Legacy format — run a new read to see the updated analysis</p>
                    </div>
                  )}

                  {data.setup && (() => {
                    const setupColors = {
                      SCALP:      { border: '#10b981', bg: 'rgba(16,185,129,0.07)',  text: '#34d399' },
                      CONVICTION: { border: '#3b82f6', bg: 'rgba(59,130,246,0.07)',  text: '#60a5fa' },
                      'NO SETUP': { border: '#6b7280', bg: 'rgba(107,114,128,0.05)', text: '#9ca3af' },
                      WAIT:       { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  text: '#fbbf24' },
                    }
                    const confColors = { HIGH: '#10b981', MEDIUM: '#f59e0b', LOW: '#6b7280' }
                    const dirColors  = { RESOLVING: '#10b981', WORSENING: '#ef4444', STABLE: '#f59e0b', UNKNOWN: '#6b7280' }

                    const sc = setupColors[data.setup.type] ?? setupColors['NO SETUP']
                    const allNews    = data.classifiedNews ?? []
                    const highImpact = allNews
                      .filter(a => a.bucket === 'B' || a.bucket === 'C')
                      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                      .slice(0, 6)
                    const alreadyPriced = data.newsToday?.alreadyPriced ?? []
                    const noiseCount    = data.newsToday?.ignore
                      ?? allNews.filter(a => a.bucket === 'A' || !a.bucket).length

                    return (
                      <>
                        {/* Card 1 — SETUP */}
                        <div style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${sc.border}`, background: sc.bg, padding: '28px 32px' }}>
                          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.12em', marginBottom: 16 }}>SETUP</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                            <p style={{ fontSize: 40, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em', color: sc.text, lineHeight: 1 }}>
                              {data.setup.type}
                            </p>
                            {data.setup.confidence && (
                              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: confColors[data.setup.confidence] ?? '#6b7280', background: 'rgba(255,255,255,0.04)', border: `1px solid ${confColors[data.setup.confidence] ?? '#6b7280'}40`, padding: '4px 10px', borderRadius: 8, letterSpacing: '0.08em' }}>
                                {data.setup.confidence}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.7 }}>{data.setup.reason}</p>
                        </div>

                        {/* Card 2 — WHY IS IT HERE */}
                        {data.whyHere && (
                          <div style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #d97706', background: 'rgba(255,255,255,0.025)', padding: '28px 32px' }}>
                            <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.12em', marginBottom: 16 }}>WHY IS IT HERE</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#d97706', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', padding: '3px 10px', borderRadius: 8, letterSpacing: '0.08em' }}>
                                {data.whyHere.cause}
                              </span>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: data.whyHere.alreadyPriced ? '#4b5563' : '#f59e0b', background: data.whyHere.alreadyPriced ? 'rgba(255,255,255,0.03)' : 'rgba(245,158,11,0.08)', border: `1px solid ${data.whyHere.alreadyPriced ? 'rgba(255,255,255,0.07)' : 'rgba(245,158,11,0.25)'}`, padding: '3px 10px', borderRadius: 8 }}>
                                {data.whyHere.alreadyPriced ? 'Already priced in' : 'Still being priced'}
                              </span>
                            </div>
                            <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.7 }}>{data.whyHere.explanation}</p>
                          </div>
                        )}

                        {/* Card 3 — IS IT RESOLVING */}
                        {data.resolution && (
                          <div style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: `3px solid ${dirColors[data.resolution.direction] ?? '#6b7280'}`, background: 'rgba(255,255,255,0.025)', padding: '28px 32px' }}>
                            <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.12em', marginBottom: 16 }}>IS IT RESOLVING</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                              <p style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 700, color: dirColors[data.resolution.direction] ?? '#9ca3af' }}>
                                {data.resolution.direction}
                              </p>
                              {data.resolution.speed && (
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 8, letterSpacing: '0.06em' }}>
                                  {data.resolution.speed}
                                </span>
                              )}
                            </div>
                            {data.resolution.catalyst && (
                              <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>
                                <span style={{ color: '#4b5563', fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', marginRight: 8 }}>CATALYST</span>
                                {data.resolution.catalyst}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Card 4 — THE TRADE (only if setup exists) */}
                        {data.trade && (data.trade.type === 'SCALP' || data.trade.type === 'CONVICTION') && (
                          <div style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${sc.border}`, background: 'rgba(255,255,255,0.025)', padding: '28px 32px' }}>
                            <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.12em', marginBottom: 16 }}>THE TRADE</p>
                            {data.trade.thesis && (
                              <p style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 1.7, marginBottom: 20, fontWeight: 500 }}>{data.trade.thesis}</p>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                              {data.trade.entryZone && (
                                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.1em', flexShrink: 0 }}>ENTRY ZONE</span>
                                  <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#34d399' }}>{data.trade.entryZone}</span>
                                </div>
                              )}
                              {data.trade.invalidatedIf && (
                                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.1em', flexShrink: 0 }}>WRONG IF</span>
                                  <span style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{data.trade.invalidatedIf}</span>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <a href="/trade" style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.05em', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              >
                                Trade Checklist
                              </a>
                              <a href="/track" style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.05em', textDecoration: 'none', display: 'block', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              >
                                Log Position
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Card 5 — TODAY'S NEWS */}
                        <div style={{ borderRadius: 16, borderTop: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid #374151', background: 'rgba(255,255,255,0.02)', padding: '28px 32px' }}>
                          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.12em', marginBottom: 16 }}>TODAY'S NEWS</p>

                          {highImpact.length === 0 && (
                            <p style={{ fontSize: 13, color: '#4b5563' }}>No significant B/C bucket news</p>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: alreadyPriced.length > 0 ? 20 : 0 }}>
                            {highImpact.map((article, i) => (
                              <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                {article.stars > 0 && (
                                  <span style={{ fontSize: 10, color: article.stars >= 3 ? '#f59e0b' : '#4a5568', flexShrink: 0, marginTop: 3, letterSpacing: '1px' }}>
                                    {'★'.repeat(article.stars)}
                                  </span>
                                )}
                                <span style={{ fontSize: 13, color: article.bucket === 'C' ? '#fca5a5' : '#d1d5db', lineHeight: 1.6 }}>
                                  {article.headline}
                                </span>
                              </a>
                            ))}
                          </div>

                          {alreadyPriced.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#374151', letterSpacing: '0.1em', marginBottom: 10 }}>ALREADY PRICED IN</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {alreadyPriced.map((headline, i) => (
                                  <p key={i} style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{headline}</p>
                                ))}
                              </div>
                            </div>
                          )}

                          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#374151', marginTop: alreadyPriced.length > 0 ? 0 : 16 }}>
                            {noiseCount} noise article{noiseCount !== 1 ? 's' : ''} ignored
                          </p>
                        </div>
                      </>
                    )
                  })()}

                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
