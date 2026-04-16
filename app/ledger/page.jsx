'use client'

import { useState, useEffect, useRef } from 'react'
import Script from 'next/script'
import { fmtEUR } from '@/lib/format'

// ─── easeOutExpo ──────────────────────────────────────────────────────────────
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target, duration, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    const timeout = setTimeout(() => {
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1)
        setVal(target * easeOutExpo(p))
        if (p < 1) requestAnimationFrame(tick)
        else setVal(target)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target])
  return val
}

// ─── Global styles ────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700&family=Geist+Mono:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; }

@keyframes driftA {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(30px,-20px) scale(1.05); }
  66%      { transform: translate(-20px,30px) scale(0.97); }
}
@keyframes driftB {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(-25px,20px) scale(1.03); }
  66%      { transform: translate(20px,-25px) scale(0.98); }
}
@keyframes driftC {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(15px,15px) scale(1.04); }
}
@keyframes dotPulse {
  0%,100% { opacity: 0.15; }
  50%      { opacity: 0.6; }
}

.pod-card {
  position: relative;
  backdrop-filter: blur(20px);
  border-radius: 16px;
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform;
}
.pod-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%);
  pointer-events: none;
  z-index: 1;
}
.pod-card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
  z-index: 2;
}
.pod-inner {
  position: relative;
  z-index: 3;
  padding: 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transform-style: preserve-3d;
}
.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.025) 2px,
    rgba(0,0,0,0.025) 4px
  );
  pointer-events: none;
  z-index: 0;
}

.cat-card {
  position: relative;
  background: #060610;
  border: 0.5px solid #0f0f1e;
  border-radius: 16px;
  padding: 16px;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.cat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-faint, rgba(255,255,255,0.05)), transparent);
  pointer-events: none;
}
.cat-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-faint, #1a1a2e);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
}

.member-row {
  position: relative;
  background: #060610;
  border: 0.5px solid #0f0f1e;
  border-radius: 13px;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
}
.member-row::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent);
  pointer-events: none;
}
.member-row:hover { transform: translateX(2px); border-color: #1a1a2e; }
.member-row.rank-1 { border-left: 1.5px solid rgba(5,150,105,0.5); background: #060e0b; }
.member-row.is-open { border-radius: 13px 13px 0 0; border-bottom-color: transparent !important; }
.member-row.no-trades { cursor: default; }
.member-row.no-trades:hover { transform: none; }

.trade-panel {
  background: #040410;
  border: 0.5px solid #0f0f1e;
  border-top: none;
  border-radius: 0 0 13px 13px;
}
`

// ─── Aurora ───────────────────────────────────────────────────────────────────
function Aurora() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%',
        width: '55%', height: '55%', borderRadius: '50%',
        background: 'radial-gradient(circle, #6366f1, transparent 70%)',
        filter: 'blur(100px)', opacity: 0.15,
        animation: 'driftA 16s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '-5%', right: '-10%',
        width: '50%', height: '50%', borderRadius: '50%',
        background: 'radial-gradient(circle, #059669, transparent 70%)',
        filter: 'blur(100px)', opacity: 0.12,
        animation: 'driftB 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '25%',
        width: '55%', height: '55%', borderRadius: '50%',
        background: 'radial-gradient(circle, #d97706, transparent 70%)',
        filter: 'blur(100px)', opacity: 0.10,
        animation: 'driftC 24s ease-in-out infinite',
      }} />
    </div>
  )
}

// ─── PodCard ──────────────────────────────────────────────────────────────────
function PodCard({ member, rank, started }) {
  const isFirst = rank === 1
  const delay = rank === 1 ? 300 : rank === 2 ? 500 : 700
  const amount = useCountUp(started && member ? (member.totalNetEur ?? 0) : 0, isFirst ? 1200 : 1000, delay)

  const bgOpacity = isFirst ? 0.7 : rank === 2 ? 0.5 : 0.3
  const borderOpacity = isFirst ? 0.1 : rank === 2 ? 0.07 : 0.04
  const rankColor = rank === 1 ? '#059669' : rank === 2 ? '#6366f1' : '#d97706'
  const amountColor = !member || member.totalNetEur >= 0 ? '#059669' : '#ef4444'

  return (
    <div style={{
      flex: isFirst ? '1.2' : '1',
      minHeight: isFirst ? '220px' : '190px',
      perspective: '1000px',
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      <div
        className="pod-card"
        style={{
          width: '100%',
          minHeight: isFirst ? '220px' : '190px',
          background: `rgba(10,10,20,${bgOpacity})`,
          border: `0.5px solid rgba(255,255,255,${borderOpacity})`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <div className="scanlines" />
        <div className="pod-inner">
          {/* Ghost rank */}
          <div style={{
            position: 'absolute', bottom: '-20px', right: '4px',
            fontFamily: 'Geist Mono, monospace', fontSize: '120px', fontWeight: '700',
            color: 'rgba(255,255,255,0.025)', lineHeight: 1,
            pointerEvents: 'none', userSelect: 'none',
            transform: 'translateZ(-5px)',
          }}>
            {rank}
          </div>

          {member ? (
            <>
              {/* Avatar */}
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: `${rankColor}18`, border: `1px solid ${rankColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Geist, sans-serif', fontSize: '13px', fontWeight: '500',
                color: rankColor, marginBottom: '10px',
                transform: 'translateZ(10px)', flexShrink: 0,
              }}>
                {member.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div style={{
                fontFamily: 'Geist, sans-serif', fontSize: '12px', fontWeight: '400',
                color: '#f8fafc', marginBottom: '4px',
                transform: 'translateZ(7px)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {member.name}
              </div>

              {/* Amount */}
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: '20px', fontWeight: '500',
                color: amountColor, lineHeight: 1, marginBottom: '6px',
                transform: 'translateZ(5px)',
              }}>
                {amount >= 0 ? '+' : ''}€{Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Stats */}
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: '9px', color: '#52525b',
                transform: 'translateZ(3px)',
              }}>
                {member.tradeCount} trades{member.winRate != null ? ` · ${member.winRate}%` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', color: '#1a1a28' }}>—</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CatCard ──────────────────────────────────────────────────────────────────
function CatCard({ title, color, rawValue, formatValue, winners, runners, started, delay = 0 }) {
  const counted = useCountUp(started ? (rawValue ?? 0) : 0, 1100, 400 + delay)
  const faint = `${color}22`

  return (
    <div className="cat-card" style={{ '--accent-faint': faint }}>
      <div style={{
        fontFamily: 'Geist, sans-serif', fontSize: '8px', fontWeight: '400',
        color: '#1a1a28', letterSpacing: '0.12em', textTransform: 'uppercase',
        marginBottom: '10px',
      }}>
        {title}
      </div>

      <div style={{
        fontFamily: 'Geist Mono, monospace', fontSize: '26px', fontWeight: '500',
        color: color, lineHeight: 1, marginBottom: '4px',
      }}>
        {formatValue(counted)}
      </div>

      <div style={{
        fontFamily: 'Geist, sans-serif', fontSize: '11px', fontWeight: '300',
        color: '#3a3a50',
        marginBottom: runners.length > 0 ? '8px' : '0',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {winners.join(' · ')}
      </div>

      {runners.length > 0 && (
        <div style={{ borderTop: '0.5px solid #0a0a18', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {runners.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Geist, sans-serif', fontSize: '10px', color: '#1a1a28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{r.name}</span>
              <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', color: '#1a1a28', flexShrink: 0 }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MemberRow ────────────────────────────────────────────────────────────────
function MemberRow({ member, rank, isExpanded, onToggle }) {
  const tradeListRef = useRef(null)
  const trades = member.allTrades ?? member.recentTrades ?? []
  const hasTrades = member.tradeCount > 0
  const rankColor = rank === 1 ? '#059669' : rank === 2 ? '#6366f1' : '#52525b'

  useEffect(() => {
    if (!isExpanded || !tradeListRef.current) return
    const rows = tradeListRef.current.querySelectorAll('.trade-row')
    const timers = []
    rows.forEach((el, i) => {
      el.style.opacity = '0'
      el.style.transform = 'translateX(-8px)'
      const t = setTimeout(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
        el.style.opacity = '1'
        el.style.transform = 'translateX(0)'
      }, i * 55)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, [isExpanded])

  return (
    <div style={{ marginBottom: '6px' }}>
      <div
        className={[
          'member-row',
          rank === 1 ? 'rank-1' : '',
          isExpanded ? 'is-open' : '',
          !hasTrades ? 'no-trades' : '',
        ].filter(Boolean).join(' ')}
        onClick={hasTrades ? onToggle : undefined}
      >
        <div style={{ padding: '13px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Left: rank + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                background: `${rankColor}18`, border: `0.5px solid ${rankColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Geist Mono, monospace', fontSize: '10px', color: rankColor,
              }}>
                {rank}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{
                    fontFamily: 'Geist, sans-serif', fontSize: '14px', fontWeight: '400',
                    color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {member.name}
                  </span>
                  {member.winStreak >= 2 && (
                    <span style={{
                      fontFamily: 'Geist Mono, monospace', fontSize: '9px', color: '#d97706',
                      background: '#d9770614', padding: '1px 5px', borderRadius: '3px', flexShrink: 0,
                    }}>
                      {member.winStreak}W
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '10px', color: '#1a1a28' }}>
                  {member.tradeCount} trades
                  {member.winRate != null ? ` · ${member.winRate}%` : ''}
                  {' · '}
                  <span style={{ color: member.thisMonthNet >= 0 ? 'rgba(5,150,105,0.35)' : 'rgba(239,68,68,0.35)' }}>
                    {member.thisMonthNet >= 0 ? '+' : ''}{fmtEUR(member.thisMonthNet)} mo
                  </span>
                </div>
              </div>
            </div>

            {/* Right: total */}
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: '15px', fontWeight: '500',
                color: member.totalNetEur >= 0 ? '#059669' : '#ef4444',
              }}>
                {fmtEUR(member.totalNetEur)}
              </div>
              {hasTrades && (
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '8px', color: '#0f0f20', marginTop: '1px' }}>
                  {isExpanded ? 'collapse' : 'expand'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trade history panel */}
      {hasTrades && (
        <div
          className="trade-panel"
          ref={tradeListRef}
          style={{
            maxHeight: isExpanded ? `${trades.length * 41 + 72}px` : '0',
            overflow: 'hidden',
            transition: 'max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Column header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '78px 52px 52px 58px 58px 1fr',
            gap: '4px',
            padding: '7px 14px',
            fontFamily: 'Geist Mono, monospace', fontSize: '8px',
            color: '#0f0f20', letterSpacing: '0.08em', textTransform: 'uppercase',
            borderBottom: '0.5px solid #0a0a18',
          }}>
            <span>Date</span><span>Type</span><span>Shares</span>
            <span>Entry</span><span>Exit</span><span>Net EUR</span>
          </div>

          {/* Rows */}
          {trades.map((trade, i) => (
            <div
              key={i}
              className="trade-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '78px 52px 52px 58px 58px 1fr',
                gap: '4px',
                padding: '8px 14px',
                borderBottom: '0.5px solid #0a0a18',
                borderLeft: `2px solid ${trade.net_eur >= 0 ? 'rgba(5,150,105,0.3)' : 'rgba(239,68,68,0.3)'}`,
                fontFamily: 'Geist Mono, monospace', fontSize: '10px',
              }}
            >
              <span style={{ color: '#1a1a28' }}>{trade.sell_date}</span>
              <span style={{ color: 'rgba(99,102,241,0.4)' }}>{trade.type}</span>
              <span style={{ color: '#1a1a28' }}>{trade.shares}</span>
              <span style={{ color: '#1a1a28' }}>${trade.buy_price}</span>
              <span style={{ color: '#1a1a28' }}>${trade.sell_price}</span>
              <span style={{ color: trade.net_eur >= 0 ? '#059669' : '#ef4444', fontWeight: '500' }}>
                {fmtEUR(trade.net_eur)}
              </span>
            </div>
          ))}

          {/* Summary */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '7px 14px',
            fontFamily: 'Geist Mono, monospace', fontSize: '9px', color: '#1a1a28',
          }}>
            <span>{member.tradeCount} trades · {member.winRate ?? '—'}% win</span>
            <span style={{ color: member.totalNetEur >= 0 ? '#059669' : '#ef4444' }}>
              {fmtEUR(member.totalNetEur)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LedgerPage ───────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [started, setStarted] = useState(false)
  const [tiltReady, setTiltReady] = useState(false)

  useEffect(() => {
    fetch('/api/ledger')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (data) setTimeout(() => setStarted(true), 150)
  }, [data])

  useEffect(() => {
    if (tiltReady && data && typeof window !== 'undefined' && window.VanillaTilt) {
      window.VanillaTilt.init(document.querySelectorAll('.pod-card'), {
        max: 15,
        speed: 400,
        glare: true,
        'max-glare': 0.15,
        scale: 1.02,
        easing: 'cubic-bezier(0.03,0.98,0.52,0.99)',
      })
    }
  }, [tiltReady, data])

  const members   = data?.members   ?? []
  const fundStats = data?.fundStats ?? {}

  const lb = members.length > 0 ? {
    mostProfitable: (() => {
      const top = Math.max(...members.map(m => m.totalNetEur))
      return members.filter(m => m.totalNetEur === top)
    })(),
    bestWinRate: (() => {
      const q = members.filter(m => m.tradeCount >= 3)
      if (!q.length) return []
      const top = Math.max(...q.map(m => m.winRate))
      return q.filter(m => m.winRate === top)
    })(),
    bestSingleTrade: (() => {
      const w = members.filter(m => m.bestTrade)
      if (!w.length) return []
      const top = Math.max(...w.map(m => m.bestTrade.net_eur))
      return w.filter(m => m.bestTrade.net_eur === top)
    })(),
    bestThisMonth: (() => {
      const top = Math.max(...members.map(m => m.thisMonthNet))
      return members.filter(m => m.thisMonthNet === top)
    })(),
  } : null

  const heroVal = useCountUp(started ? (fundStats?.totalNetEur ?? 0) : 0, 1800, 300)

  const fmtCounted = (v) => {
    const abs = Math.abs(v)
    const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (v < 0 ? '-€' : '€') + s
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', background: '#030308' }}>
      <style>{STYLES}</style>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.1/vanilla-tilt.min.js"
        onLoad={() => setTiltReady(true)}
      />

      <Aurora />

      <div style={{ maxWidth: '420px', margin: '0 auto', padding: '28px 16px 80px', position: 'relative', zIndex: 1 }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', paddingTop: '80px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#1a1a28',
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'rgba(239,68,68,0.4)', paddingTop: '40px' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Header ── */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: '9px', fontWeight: '400',
                color: '#0f0f20', letterSpacing: '0.2em', textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                Fund
              </div>

              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: '52px', fontWeight: '200',
                letterSpacing: '-4px',
                color: (fundStats.totalNetEur ?? 0) >= 0 ? '#059669' : '#ef4444',
                lineHeight: 1, marginBottom: '16px',
              }}>
                <span style={{ color: '#1e1e2e' }}>€</span>
                {heroVal < 0 ? '-' : ''}
                {Math.abs(heroVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { label: 'trades',   value: fundStats.totalTrades ?? 0 },
                  { label: 'win rate', value: fundStats.fundWinRate != null ? `${fundStats.fundWinRate}%` : '—' },
                  { label: 'open pos', value: fundStats.totalOpenPositions ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: '#060610', border: '0.5px solid #0a0a18',
                    borderRadius: '6px', padding: '5px 10px',
                  }}>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '8px', color: '#0f0f20', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1px' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '14px', fontWeight: '500', color: '#f8fafc' }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Podium ── */}
            {members.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '20px' }}>
                <PodCard member={members[1] ?? null} rank={2} started={started} />
                <PodCard member={members[0] ?? null} rank={1} started={started} />
                <PodCard member={members[2] ?? null} rank={3} started={started} />
              </div>
            )}

            {/* ── Category grid ── */}
            {lb && (
              <>
                <div style={{
                  fontFamily: 'Geist, sans-serif', fontSize: '9px', color: '#0f0f20',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px',
                }}>
                  Leaderboard
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                  <CatCard
                    title="Most Profitable" color="#059669"
                    rawValue={lb.mostProfitable[0]?.totalNetEur ?? 0}
                    formatValue={fmtCounted}
                    winners={lb.mostProfitable.map(m => m.name)}
                    runners={[...members].sort((a,b) => b.totalNetEur - a.totalNetEur)
                      .filter(m => !lb.mostProfitable.find(w => w.userId === m.userId))
                      .slice(0,3).map(m => ({ name: m.name, value: fmtEUR(m.totalNetEur) }))}
                    started={started} delay={0}
                  />
                  <CatCard
                    title="Best Win Rate" color="#6366f1"
                    rawValue={lb.bestWinRate[0]?.winRate ?? 0}
                    formatValue={v => lb.bestWinRate.length > 0 ? `${Math.round(v)}%` : '—'}
                    winners={lb.bestWinRate.length > 0 ? lb.bestWinRate.map(m => m.name) : ['min 3 trades']}
                    runners={[...members].filter(m => m.tradeCount >= 3).sort((a,b) => b.winRate - a.winRate)
                      .filter(m => !lb.bestWinRate.find(w => w.userId === m.userId))
                      .slice(0,3).map(m => ({ name: m.name, value: `${m.winRate}%` }))}
                    started={started} delay={150}
                  />
                  <CatCard
                    title="Best Single Trade" color="#d97706"
                    rawValue={lb.bestSingleTrade[0]?.bestTrade?.net_eur ?? 0}
                    formatValue={v => lb.bestSingleTrade.length > 0 ? fmtCounted(v) : '—'}
                    winners={lb.bestSingleTrade.length > 0 ? lb.bestSingleTrade.map(m => m.name) : ['—']}
                    runners={[...members].filter(m => m.bestTrade).sort((a,b) => b.bestTrade.net_eur - a.bestTrade.net_eur)
                      .filter(m => !lb.bestSingleTrade.find(w => w.userId === m.userId))
                      .slice(0,3).map(m => ({ name: m.name, value: fmtEUR(m.bestTrade.net_eur) }))}
                    started={started} delay={300}
                  />
                  <CatCard
                    title="Best This Month" color="#059669"
                    rawValue={lb.bestThisMonth[0]?.thisMonthNet ?? 0}
                    formatValue={fmtCounted}
                    winners={lb.bestThisMonth.map(m => m.name)}
                    runners={[...members].sort((a,b) => b.thisMonthNet - a.thisMonthNet)
                      .filter(m => !lb.bestThisMonth.find(w => w.userId === m.userId))
                      .slice(0,3).map(m => ({ name: m.name, value: fmtEUR(m.thisMonthNet) }))}
                    started={started} delay={450}
                  />
                </div>
              </>
            )}

            {/* ── Members ── */}
            {members.length > 0 && (
              <>
                <div style={{
                  fontFamily: 'Geist, sans-serif', fontSize: '9px', color: '#0f0f20',
                  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px',
                }}>
                  Members
                </div>
                {members.map((member, i) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    rank={i + 1}
                    isExpanded={expanded === member.userId}
                    onToggle={() => setExpanded(expanded === member.userId ? null : member.userId)}
                  />
                ))}
              </>
            )}

            {members.length === 0 && (
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: '#0f0f20' }}>
                No members yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
