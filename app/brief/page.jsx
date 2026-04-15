'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── ET time helpers ───────────────────────────────────────────────────────────

function getETMinutes() {
  const et     = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const etDate = new Date(et)
  return etDate.getHours() * 60 + etDate.getMinutes()
}

function getETSession() {
  const mins = getETMinutes()
  if (mins >= 210 && mins < 540)  return 'premarket'   // 3:30am–9:00am ET
  if (mins >= 540 && mins < 570)  return 'preopen'     // 9:00am–9:30am ET
  if (mins >= 570 && mins < 960)  return 'open'        // 9:30am–4:00pm ET
  if (mins >= 960 && mins < 1200) return 'afterhours'  // 4:00pm–8:00pm ET
  return 'closed'
}

function isDuringHours() {
  const mins = getETMinutes()
  return mins >= 210 && mins < 1200
}

function shouldAutoGenerate(briefData) {
  const { dawn, premarket } = briefData
  const session = getETSession()
  const mins    = getETMinutes()

  // Dawn window: 3:30am–9:00am ET
  if (session === 'premarket' && !dawn) return 'dawn'

  // Premarket window: 9:00am–9:30am ET
  if (mins >= 540 && mins < 570 && !premarket) return 'premarket'

  return null
}

function getRefreshLabel() {
  return isDuringHours() ? 'Refresh Brief' : 'Next brief at 3:30am ET'
}

// ── Display helpers ───────────────────────────────────────────────────────────

function typeBadgeLabel(type) {
  const map = { dawn: 'DAWN', premarket: 'PRE-MARKET', refresh: 'REFRESH' }
  return map[type] ?? (type?.toUpperCase() ?? '—')
}

function genTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }) + ' ET'
}

function setupColors(type) {
  switch (type) {
    case 'SCALP':
    case 'CONVICTION':
      return { border: '#10b981', bg: 'rgba(16,185,129,0.07)',  text: '#34d399', badge: 'rgba(16,185,129,0.15)' }
    case 'WAIT':
      return { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  text: '#fbbf24', badge: 'rgba(245,158,11,0.15)' }
    default:
      return { border: '#4b5563', bg: 'rgba(107,114,128,0.05)', text: '#6b7280', badge: 'rgba(107,114,128,0.12)' }
  }
}

function actionColors(action) {
  switch (action) {
    case 'ADD':    return { text: '#34d399', border: '#10b981' }
    case 'HOLD':   return { text: '#60a5fa', border: '#3b82f6' }
    case 'REDUCE': return { text: '#fbbf24', border: '#f59e0b' }
    case 'CLOSE':  return { text: '#f87171', border: '#ef4444' }
    default:       return { text: '#6b7280', border: '#4b5563' }
  }
}

const CARD = {
  borderRadius: 16,
  border:     '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.025)',
  padding:    '24px',
}

const LABEL = {
  fontSize:       10,
  fontFamily:     'monospace',
  color:          '#4b5563',
  letterSpacing:  '0.14em',
  textTransform:  'uppercase',
  marginBottom:   14,
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ item, expanded, onToggle }) {
  const sc = setupColors(item.setup?.type)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 20px', textAlign: 'left', cursor: 'pointer',
          background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent',
          border: 'none', display: 'flex', alignItems: 'center', gap: 10,
          flexWrap: 'wrap', transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#4b5563', flexShrink: 0 }}>
          {item.date ?? '—'}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6b7280', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
          {typeBadgeLabel(item.type)}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: sc.text, background: sc.badge, padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
          {item.setup?.type ?? '—'}
        </span>
        <span style={{ fontSize: 12, color: '#6b7280', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.oneLine}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {item.summary && (
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{item.summary}</p>
          )}
          {item.watchToday?.length > 0 && (
            <div>
              <p style={{ ...LABEL, marginBottom: 8 }}>Watch Today</p>
              {item.watchToday.map((w, i) => (
                <p key={i} style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, paddingLeft: 10, borderLeft: '2px solid rgba(255,255,255,0.08)', marginBottom: 6 }}>
                  {i + 1}. {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Brief display ─────────────────────────────────────────────────────────────

function BriefDisplay({ brief }) {
  const sc = setupColors(brief.setup?.type)
  const ac = actionColors(brief.positions?.action)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Section 1 — THE ONE LINE */}
      <div style={{
        borderRadius: 16, padding: '28px 24px',
        borderLeft: `4px solid ${sc.border}`,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: sc.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#6b7280', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 8, letterSpacing: '0.1em' }}>
            {typeBadgeLabel(brief.type)}
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
            {genTime(brief.generatedAt)}
          </span>
        </div>
        <p style={{ fontSize: 22, color: sc.text, lineHeight: 1.5, fontWeight: 500 }}>
          {brief.oneLine}
        </p>
      </div>

      {/* Section 2 — SETUP + POSITIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>

        {/* SETUP */}
        <div style={{
          ...CARD,
          borderLeft: `3px solid ${sc.border}`,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={LABEL}>Setup</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: sc.text, lineHeight: 1 }}>
              {brief.setup?.type ?? '—'}
            </p>
            {brief.setup?.confidence && (
              <span style={{
                fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em',
                color: brief.setup.confidence === 'HIGH' ? '#10b981' : brief.setup.confidence === 'MEDIUM' ? '#f59e0b' : '#6b7280',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '3px 8px', borderRadius: 6,
              }}>
                {brief.setup.confidence}
              </span>
            )}
          </div>
          {brief.setup?.entryZone && (
            <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.1em', flexShrink: 0 }}>ENTRY</span>
              <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#34d399' }}>{brief.setup.entryZone}</span>
            </div>
          )}
          {brief.setup?.thesis && (
            <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6, marginBottom: brief.setup.invalidatedIf ? 10 : 0 }}>
              {brief.setup.thesis}
            </p>
          )}
          {brief.setup?.invalidatedIf && (
            <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#4b5563', letterSpacing: '0.08em', marginRight: 6 }}>WRONG IF</span>
              {brief.setup.invalidatedIf}
            </p>
          )}
        </div>

        {/* POSITIONS */}
        <div style={{
          ...CARD,
          borderLeft: `3px solid ${ac.border}`,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p style={LABEL}>Positions</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: ac.text, lineHeight: 1 }}>
              {brief.positions?.action ?? 'NONE'}
            </p>
            {brief.positions?.interestWarning && (
              <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', padding: '3px 8px', borderRadius: 6 }}>
                INTEREST WARNING
              </span>
            )}
          </div>
          {brief.positions?.reason && (
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6, marginBottom: brief.positions?.action === 'ADD' ? 16 : 0 }}>
              {brief.positions.reason}
            </p>
          )}
          {brief.positions?.action === 'ADD' && (
            <Link href="/trade" style={{ display: 'inline-block', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.06em', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.07)', padding: '6px 14px', borderRadius: 8, textDecoration: 'none' }}>
              → Trade Checklist
            </Link>
          )}
        </div>
      </div>

      {/* Section 3 — DETAIL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary */}
        {brief.summary && (
          <div style={CARD}>
            <p style={LABEL}>Summary</p>
            <p style={{ fontSize: 14, color: '#d1d5db', lineHeight: 1.8 }}>{brief.summary}</p>
            {brief.nvda && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.1em', marginRight: 8 }}>SMA STATUS</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9ca3af' }}>{brief.nvda.smaStatus}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b5563', letterSpacing: '0.1em', marginRight: 8 }}>KEY LEVEL</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9ca3af' }}>{brief.nvda.keyLevel}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Watch Today + Key News */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

          {brief.watchToday?.length > 0 && (
            <div style={CARD}>
              <p style={LABEL}>Watch Today</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {brief.watchToday.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', flexShrink: 0, paddingTop: 2 }}>{i + 1}.</span>
                    <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.6 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.keyNews?.length > 0 && (
            <div style={CARD}>
              <p style={LABEL}>Key News</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {brief.keyNews.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0, paddingTop: 3, color: item.impact === 'HIGH' ? '#f59e0b' : '#4b5563' }}>
                      {item.impact}
                    </span>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: item.impact === 'HIGH' ? '#e5e7eb' : '#6b7280', textDecoration: item.alreadyPriced ? 'line-through' : 'none' }}>
                      {item.headline}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const [briefData,     setBriefData]     = useState({ dawn: null, premarket: null, history: [], today: '' })
  const [displayBrief,  setDisplayBrief]  = useState(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [historyOpen,   setHistoryOpen]   = useState(false)
  const [expandedIdx,   setExpandedIdx]   = useState(null)
  const [autoTriggered, setAutoTriggered] = useState(false)

  // Initial load
  useEffect(() => {
    fetch('/api/brief')
      .then(r => r.json())
      .then(data => {
        setBriefData(data)
        setDisplayBrief(data.premarket ?? data.dawn ?? null)
      })
      .catch(() => {})
  }, [])

  // Auto-generate once after data loads (runs after today is set)
  useEffect(() => {
    if (autoTriggered || !briefData.today) return
    const autoType = shouldAutoGenerate(briefData)
    if (autoType) {
      setAutoTriggered(true)
      generate(autoType)
    }
  }, [briefData.today, briefData.dawn, briefData.premarket]) // eslint-disable-line

  async function generate(type) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brief', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      const result = await res.json()
      setDisplayBrief(result)
      if (type === 'dawn') {
        setBriefData(prev => ({ ...prev, dawn: result }))
      } else if (type === 'premarket') {
        setBriefData(prev => ({ ...prev, premarket: result }))
      }
      if (type !== 'refresh') {
        setBriefData(prev => ({
          ...prev,
          history: [{ ...result, date: prev.today }, ...prev.history].slice(0, 10),
        }))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleRefresh() {
    if (isDuringHours()) generate('refresh')
  }

  const duringHours   = isDuringHours()
  const refreshLabel  = getRefreshLabel()

  return (
    <div style={{ minHeight: '100dvh', background: '#080910', color: '#eef2ff', paddingBottom: 48 }}>

      {/* Refresh button — fixed top right */}
      <button
        onClick={handleRefresh}
        disabled={loading || !duringHours}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          padding: '8px 16px', borderRadius: 10,
          fontSize: 11, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.06em',
          cursor: (loading || !duringHours) ? 'default' : 'pointer',
          transition: 'all 0.15s',
          border:     duringHours ? '1px solid rgba(91,156,246,0.35)' : '1px solid rgba(255,255,255,0.07)',
          background: duringHours ? 'rgba(91,156,246,0.10)'          : 'rgba(255,255,255,0.03)',
          color:      duringHours ? '#7aabf8'                         : '#374151',
        }}
      >
        {loading ? '◌ GENERATING...' : refreshLabel.toUpperCase()}
      </button>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 0' }}>

        <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#374151', letterSpacing: '0.15em', marginBottom: 24 }}>
          DAILY BRIEF
        </p>

        {/* Loading */}
        {loading && (
          <div style={{ ...CARD, padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              className="animate-pulse"
              style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(91,156,246,0.08)', border: '1px solid rgba(91,156,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#5b9cf6' }}
            >J</div>
            <p style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace' }}>
              Jarvis is analysing overnight developments...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ borderRadius: 16, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(239,68,68,0.05)', padding: '20px 24px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#f87171', fontFamily: 'monospace' }}>{error}</p>
          </div>
        )}

        {/* Brief content */}
        {!loading && displayBrief && <BriefDisplay brief={displayBrief} />}

        {/* Empty state */}
        {!loading && !displayBrief && !error && (
          <div style={{ ...CARD, padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.8, maxWidth: 380, margin: '0 auto' }}>
              Next dawn brief generates automatically when you open this page at premarket
              <span style={{ display: 'block', marginTop: 8, fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>3:30am ET / 8:30am UK</span>
            </p>
          </div>
        )}

        {/* Section 4 — History */}
        {briefData.history.length > 0 && !loading && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setHistoryOpen(o => !o)}
              style={{
                width: '100%', padding: '14px 20px', textAlign: 'left', cursor: 'pointer',
                background: historyOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: historyOpen ? '16px 16px 0 0' : 16,
                fontSize: 12, fontFamily: 'monospace', color: '#6b7280', letterSpacing: '0.06em',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>Previous Briefs ({briefData.history.length})</span>
              <span>{historyOpen ? '▲' : '▼'}</span>
            </button>
            {historyOpen && (
              <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
                {briefData.history.map((item, i) => (
                  <HistoryRow
                    key={`${item.date}-${item.type}-${i}`}
                    item={item}
                    expanded={expandedIdx === i}
                    onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
