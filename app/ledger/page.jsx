'use client'

import { useState, useEffect, useRef } from 'react'
import { fmtEUR } from '@/lib/format'

// ─── easeOutExpo ─────────────────────────────────────────────────────────────
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }

// ─── useCountUp ──────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) { setVal(0); return }
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

// ─── Name → warm palette color ───────────────────────────────────────────────
function nameColor(name) {
  const palette = ['#c8a870', '#d4806a', '#8aae88', '#c87a8a', '#70a898', '#d4a060', '#a8a870']
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return palette[h % palette.length]
}

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name || '?').slice(0, 2).toUpperCase()
}

function fmtSigned(v) {
  const abs = Math.abs(v)
  const s = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (v < 0 ? '-€' : '+€') + s
}

// ─── Global CSS ──────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@200;300;400;500;600;700;800&family=Geist+Mono:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; }
* { font-family: 'Geist', sans-serif; }

@keyframes holoShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dotPulse {
  0%, 100% { opacity: 0.2; transform: scale(0.85); }
  50%       { opacity: 0.9; transform: scale(1.15); }
}

.pod-card-tilt {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  will-change: transform;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3);
}
.pod-card-tilt.holo-1 {
  background: linear-gradient(135deg,
    #ffd6e0 0%, #c3fbd8 15%, #a8d8ff 30%,
    #ffd6a0 45%, #e8c3ff 60%, #c3fbd8 75%,
    #ffd6e0 90%, #a8d8ff 100%
  );
  background-size: 300% 300%;
  animation: holoShift 6s ease infinite;
}
.pod-card-tilt.holo-2 {
  background: linear-gradient(135deg,
    #e8f4ff 0%, #d4e8ff 30%, #c8d8f0 60%, #e0ecff 100%
  );
}
.pod-card-tilt.holo-3 {
  background: linear-gradient(135deg,
    #fff4e8 0%, #f0e8d8 30%, #e8dcc8 60%, #f8f0e4 100%
  );
}
.pod-ghost {
  position: absolute;
  bottom: -20px;
  right: 8px;
  font-size: 140px;
  font-weight: 800;
  color: rgba(0,0,0,0.07);
  line-height: 1;
  pointer-events: none;
  user-select: none;
  font-family: 'Geist', sans-serif;
  letter-spacing: -8px;
  z-index: 0;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 640px) {
  .cat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.cat-card {
  background: #1f1610;
  border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.cat-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: var(--cat-accent, rgba(255,255,255,0.1));
  opacity: 0.15;
}
.cat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}

.member-card {
  background: #150f09;
  border: 0.5px solid rgba(255,255,255,0.05);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.member-card.no-trades { cursor: default; }
.member-card.rank-1 {
  border-left: 2px solid rgba(200,168,112,0.6);
  background: linear-gradient(135deg, #1a1208 0%, #120e06 100%);
}
.member-card.is-open {
  border-radius: 14px 14px 0 0;
  border-bottom-color: transparent;
  margin-bottom: 0;
}

.trade-panel {
  background: #0f0a06;
  border: 0.5px solid rgba(255,255,255,0.05);
  border-top: none;
  border-radius: 0 0 14px 14px;
  margin-bottom: 8px;
  overflow: hidden;
}

.fade-up {
  opacity: 0;
  animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
}
`

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 48 }) {
  const color = nameColor(name || '')
  const inits = getInitials(name || '')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}33, ${color}77)`,
      border: '2px solid rgba(255,255,255,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Geist, sans-serif',
      fontSize: Math.round(size * 0.34),
      fontWeight: '600',
      color: '#1a0f0a',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {inits}
    </div>
  )
}

// ─── PodCard ─────────────────────────────────────────────────────────────────
function PodCard({ member, rank, started }) {
  const isFirst = rank === 1
  const avatarSize = isFirst ? 64 : 48
  const cardMinH = isFirst ? 230 : 185
  const delay = rank === 1 ? 200 : rank === 2 ? 400 : 600
  const netVal = useCountUp(started ? (member?.totalNetEur ?? 0) : 0, 1200, delay)

  const statFontSize = isFirst ? 18 : 13

  return (
    <div style={{ flex: isFirst ? '1.4' : '1', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
      {/* Avatar floating above */}
      <div style={{ marginBottom: -4, position: 'relative', zIndex: 10 }}>
        {member
          ? <Avatar name={member.name} size={avatarSize} />
          : <div style={{ width: avatarSize, height: avatarSize, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.08)' }} />
        }
      </div>

      {/* Card + Platform */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
        {/* Holographic card */}
        <div
          className={`pod-card-tilt holo-${rank}`}
          style={{ width: '100%', minHeight: cardMinH, padding: 'clamp(12px,2.5vw,28px) clamp(10px,2vw,24px)', borderRadius: '20px 20px 0 0', position: 'relative', zIndex: 1 }}
        >
          <div className="pod-ghost">{rank}</div>

          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {member ? (
              <>
                <div style={{
                  fontFamily: 'Geist, sans-serif', fontSize: 16, fontWeight: 600,
                  color: '#1a0f0a', marginBottom: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {member.name}
                </div>
                <div style={{
                  fontFamily: 'Geist, sans-serif', fontSize: 11, fontWeight: 400,
                  color: '#5a4535', marginBottom: 16, textTransform: 'capitalize',
                }}>
                  {member.role || 'Trader'}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: statFontSize, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                      <span style={{ color: '#3a2a1a' }}>{netVal < 0 ? '-€' : '+€'}</span>
                      <span style={{ color: '#1a0f0a' }}>{Math.abs(netVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#7a5a45', marginTop: 4, letterSpacing: '0.04em' }}>P&L</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: statFontSize, fontWeight: 500, color: '#1a0f0a', lineHeight: 1.2 }}>
                      {member.winRate != null ? `${member.winRate}%` : '—'}
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#7a5a45', marginTop: 4, letterSpacing: '0.04em' }}>WIN</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: statFontSize, fontWeight: 500, color: '#1a0f0a', lineHeight: 1.2 }}>
                      {member.tradeCount}
                    </div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#7a5a45', marginTop: 4, letterSpacing: '0.04em' }}>TRADES</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: 'rgba(0,0,0,0.15)', fontFamily: 'Geist Mono', fontSize: 13, textAlign: 'center', paddingBottom: 8 }}>—</div>
            )}
          </div>
        </div>

        {/* Platform base */}
        <div style={{
          width: '100%',
          height: rank === 1 ? '44px' : '30px',
          marginTop: '-4px',
          borderRadius: '0 0 14px 14px',
          background: rank === 1
            ? 'linear-gradient(180deg, #b8983a 0%, #8a6e28 60%, #6a5218 100%)'
            : rank === 2
            ? 'linear-gradient(180deg, #9aa8b8 0%, #7a8898 60%, #5a6878 100%)'
            : 'linear-gradient(180deg, #b87848 0%, #8a5830 60%, #6a3c18 100%)',
          boxShadow: rank === 1
            ? '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 6px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
          zIndex: 0,
          flexShrink: 0,
        }} />
      </div>
    </div>
  )
}

// ─── CatCard ─────────────────────────────────────────────────────────────────
function CatCard({ label, color, rawValue, formatValue, winner, runners, started, delay = 0 }) {
  const counted = useCountUp(started ? (rawValue ?? 0) : 0, 1100, 400 + delay)
  return (
    <div className="cat-card" style={{ '--cat-accent': color }}>
      <div style={{
        fontFamily: 'Geist Mono, monospace', fontSize: 8, color: '#8a6a4a',
        letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Geist Mono, monospace', fontSize: 28, fontWeight: 500,
        color, opacity: 1, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px',
      }}>
        {formatValue(counted)}
      </div>
      <div style={{
        fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 300,
        color: '#c8b898', marginBottom: runners.length > 0 ? 10 : 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {winner}
      </div>
      {runners.length > 0 && (
        <>
          <div style={{ height: 1, background: '#2a1e10', marginBottom: 8 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {runners.slice(0, 3).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  background: '#2a1e10', color: '#6b4a35',
                  fontFamily: 'Geist Mono, monospace', fontSize: 8,
                  padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                }}>
                  {i + 2}
                </span>
                <span style={{ fontFamily: 'Geist, sans-serif', fontSize: 10, color: '#6b4a35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#6b4a35', flexShrink: 0 }}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MemberRow ───────────────────────────────────────────────────────────────
function MemberRow({ member, rank, isExpanded, onToggle }) {
  const tradeListRef = useRef(null)
  const trades = member.allTrades ?? member.recentTrades ?? []
  const hasTrades = member.tradeCount > 0
  const isFirst = rank === 1

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
      }, i * 50)
      timers.push(t)
    })
    return () => timers.forEach(clearTimeout)
  }, [isExpanded])

  return (
    <div>
      <div
        className={['member-card', isFirst ? 'rank-1' : '', isExpanded ? 'is-open' : '', !hasTrades ? 'no-trades' : ''].filter(Boolean).join(' ')}
        onClick={hasTrades ? onToggle : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Rank */}
          <div style={{
            fontFamily: 'Geist Mono, monospace', fontSize: 18, fontWeight: 600,
            color: isFirst ? 'rgba(200,168,112,0.8)' : '#8a6a4a',
            width: 32, flexShrink: 0, textAlign: 'right',
          }}>
            {rank}
          </div>

          {/* Avatar */}
          <Avatar name={member.name} size={40} />

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{
                fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500,
                color: '#f0ece8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {member.name}
              </span>
              {isFirst && (
                <span style={{
                  background: 'rgba(200,168,112,0.1)', border: '0.5px solid rgba(200,168,112,0.25)',
                  borderRadius: 4, padding: '2px 7px',
                  fontFamily: 'Geist Mono, monospace', fontSize: 7,
                  color: 'rgba(200,168,112,0.8)', letterSpacing: '0.08em', flexShrink: 0,
                }}>
                  WINNING
                </span>
              )}
              {!isFirst && member.winStreak >= 2 && (
                <span style={{
                  background: 'rgba(200,168,112,0.06)', border: '0.5px solid rgba(200,168,112,0.12)',
                  borderRadius: 4, padding: '2px 6px',
                  fontFamily: 'Geist Mono, monospace', fontSize: 7,
                  color: 'rgba(200,168,112,0.5)', letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  {member.winStreak}W
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, color: '#a08060' }}>
              {member.tradeCount} trades
              {member.winRate != null ? ` · ${member.winRate}%` : ''}
              {' · '}
              <span style={{ color: member.thisMonthNet >= 0 ? 'rgba(22,163,74,0.65)' : 'rgba(220,38,38,0.65)' }}>
                {member.thisMonthNet >= 0 ? '+' : ''}{fmtEUR(member.thisMonthNet)} mo
              </span>
            </div>
          </div>

          {/* Total */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'Geist Mono, monospace', fontSize: 16, fontWeight: 500,
              color: member.totalNetEur >= 0 ? '#16a34a' : '#dc2626',
            }}>
              {fmtEUR(member.totalNetEur)}
            </div>
            {hasTrades && (
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#6b4a35', marginTop: 2 }}>
                {isExpanded ? '▲' : '▼'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade history panel */}
      {hasTrades && (
        <div
          className="trade-panel"
          ref={tradeListRef}
          style={{
            maxHeight: isExpanded ? `${trades.length * 40 + 72}px` : '0',
            transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 56px 48px 62px 62px 1fr',
            gap: 4, padding: '7px 16px',
            fontFamily: 'Geist Mono, monospace', fontSize: 8,
            color: '#8a6a4a', letterSpacing: '0.08em', textTransform: 'uppercase',
            borderBottom: '0.5px solid rgba(255,255,255,0.03)',
          }}>
            <span>Date</span><span>Type</span><span>Shrs</span>
            <span>Entry</span><span>Exit</span><span>Net EUR</span>
          </div>

          {/* Trade rows */}
          {trades.map((t, i) => (
            <div
              key={i}
              className="trade-row"
              style={{
                display: 'grid', gridTemplateColumns: '80px 56px 48px 62px 62px 1fr',
                gap: 4, padding: '9px 16px',
                borderBottom: '0.5px solid rgba(255,255,255,0.03)',
                borderLeft: `2px solid ${t.net_eur >= 0 ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)'}`,
                fontFamily: 'Geist Mono, monospace', fontSize: 10,
              }}
            >
              <span style={{ color: '#8a6a4a' }}>{t.sell_date}</span>
              <span style={{ color: 'rgba(99,102,241,0.5)' }}>{t.type}</span>
              <span style={{ color: '#8a6a4a' }}>{t.shares}</span>
              <span style={{ color: '#8a6a4a' }}>${t.buy_price}</span>
              <span style={{ color: '#8a6a4a' }}>${t.sell_price}</span>
              <span style={{ color: t.net_eur >= 0 ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                {fmtEUR(t.net_eur)}
              </span>
            </div>
          ))}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 16px',
            fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#8a6a4a',
          }}>
            <span>{member.tradeCount} trades · {member.winRate ?? '—'}% win</span>
            <span style={{ color: member.totalNetEur >= 0 ? '#16a34a' : '#dc2626' }}>
              {fmtEUR(member.totalNetEur)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LedgerPage ──────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    fetch('/api/ledger')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => {
    if (data) setTimeout(() => setStarted(true), 150)
  }, [data])

  // Vanilla-tilt via CDN
  useEffect(() => {
    if (!data) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.1/vanilla-tilt.min.js'
    script.onload = () => {
      if (window.VanillaTilt) {
        window.VanillaTilt.init(document.querySelectorAll('.pod-card-tilt'), {
          max: 12,
          speed: 600,
          glare: true,
          'max-glare': 0.2,
          scale: 1.03,
          easing: 'cubic-bezier(0.03,0.98,0.52,0.99)',
        })
      }
    }
    document.body.appendChild(script)
    return () => { if (document.body.contains(script)) document.body.removeChild(script) }
  }, [data])

  const members = data?.members ?? []
  const fundStats = data?.fundStats ?? {}

  // Category leaders
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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0a07',
      backgroundImage: `
        radial-gradient(ellipse at 20% 20%, rgba(180,80,20,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(120,60,10,0.06) 0%, transparent 60%),
        url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")
      `,
    }}>
      <style>{STYLES}</style>

      <div style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: 'clamp(20px,4vw,40px) clamp(16px,3vw,32px)',
        paddingBottom: 100,
      }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 100 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#3a2a1a',
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'rgba(220,38,38,0.5)', paddingTop: 60 }}>
            {error}
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="fade-up" style={{ animationDelay: '0ms', marginBottom: 48 }}>
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 9, fontWeight: 400,
                color: '#8a6a4a', letterSpacing: '0.25em', textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Fund
              </div>

              {/* Hero total */}
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 'clamp(40px,7vw,64px)',
                fontWeight: 200, letterSpacing: '-4px', color: '#faf8f5',
                lineHeight: 1, marginBottom: 20,
              }}>
                <span style={{ color: '#3a2a1a', fontWeight: 100 }}>€</span>
                {heroVal < 0 ? '-' : ''}
                {Math.abs(heroVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Three inline stats */}
              <div style={{
                fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#a08060',
                display: 'flex', alignItems: 'center', gap: 8,
                flexWrap: 'wrap', marginBottom: 20,
              }}>
                <span>{fundStats.totalTrades ?? 0} trades</span>
                <span style={{ color: '#a08060' }}>·</span>
                <span>{fundStats.fundWinRate != null ? `${fundStats.fundWinRate}% win rate` : '—'}</span>
                <span style={{ color: '#a08060' }}>·</span>
                <span>{fundStats.totalOpenPositions ?? 0} open positions</span>
              </div>

              {/* Best trade strip */}
              {fundStats.bestTradeEver && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  background: 'rgba(180,80,20,0.1)', border: '0.5px solid rgba(180,80,20,0.2)',
                  borderRadius: 8, padding: '8px 14px',
                }}>
                  <span style={{ color: '#c8a870', fontSize: 14 }}>★</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 500, color: '#f0ece8' }}>
                    {fundStats.bestTradeEver.memberName}
                  </span>
                  <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#e8b870' }}>
                    +€{fundStats.bestTradeEver.net_eur?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {fundStats.bestTradeEver.buy_price && (
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, color: '#8a7060' }}>
                      ${fundStats.bestTradeEver.buy_price}→${fundStats.bestTradeEver.sell_price}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── Podium ────────────────────────────────────────────── */}
            {members.length > 0 && (
              <div className="fade-up" style={{ animationDelay: '80ms', marginBottom: 36 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <PodCard member={members[1] ?? null} rank={2} started={started} />
                  <PodCard member={members[0] ?? null} rank={1} started={started} />
                  <PodCard member={members[2] ?? null} rank={3} started={started} />
                </div>
              </div>
            )}

            {/* ── Category strip ────────────────────────────────────── */}
            {lb && members.length > 0 && (
              <div className="fade-up" style={{ animationDelay: '160ms', marginBottom: 36 }}>
                <div className="cat-grid">
                  <CatCard
                    label="Most Profitable"
                    color="#16a34a"
                    rawValue={lb.mostProfitable[0]?.totalNetEur ?? 0}
                    formatValue={v => fmtSigned(v)}
                    winner={lb.mostProfitable.map(m => m.name).join(' · ')}
                    runners={[...members].sort((a, b) => b.totalNetEur - a.totalNetEur)
                      .filter(m => !lb.mostProfitable.find(w => w.userId === m.userId))
                      .slice(0, 3).map(m => ({ name: m.name, value: fmtEUR(m.totalNetEur) }))}
                    started={started} delay={0}
                  />
                  <CatCard
                    label="Best Win Rate"
                    color="#6366f1"
                    rawValue={lb.bestWinRate[0]?.winRate ?? 0}
                    formatValue={v => lb.bestWinRate.length > 0 ? `${Math.round(v)}%` : '—'}
                    winner={lb.bestWinRate.length > 0 ? lb.bestWinRate.map(m => m.name).join(' · ') : 'min 3 trades'}
                    runners={[...members].filter(m => m.tradeCount >= 3)
                      .sort((a, b) => b.winRate - a.winRate)
                      .filter(m => !lb.bestWinRate.find(w => w.userId === m.userId))
                      .slice(0, 3).map(m => ({ name: m.name, value: `${m.winRate}%` }))}
                    started={started} delay={100}
                  />
                  <CatCard
                    label="Best Single Trade"
                    color="#c8a870"
                    rawValue={lb.bestSingleTrade[0]?.bestTrade?.net_eur ?? 0}
                    formatValue={v => lb.bestSingleTrade.length > 0 ? fmtSigned(v) : '—'}
                    winner={lb.bestSingleTrade.length > 0 ? lb.bestSingleTrade.map(m => m.name).join(' · ') : '—'}
                    runners={[...members].filter(m => m.bestTrade)
                      .sort((a, b) => b.bestTrade.net_eur - a.bestTrade.net_eur)
                      .filter(m => !lb.bestSingleTrade.find(w => w.userId === m.userId))
                      .slice(0, 3).map(m => ({ name: m.name, value: fmtEUR(m.bestTrade.net_eur) }))}
                    started={started} delay={200}
                  />
                  <CatCard
                    label="Best This Month"
                    color="#e07040"
                    rawValue={lb.bestThisMonth[0]?.thisMonthNet ?? 0}
                    formatValue={v => fmtSigned(v)}
                    winner={lb.bestThisMonth.map(m => m.name).join(' · ')}
                    runners={[...members].sort((a, b) => b.thisMonthNet - a.thisMonthNet)
                      .filter(m => !lb.bestThisMonth.find(w => w.userId === m.userId))
                      .slice(0, 3).map(m => ({ name: m.name, value: fmtEUR(m.thisMonthNet) }))}
                    started={started} delay={300}
                  />
                </div>
              </div>
            )}

            {/* ── Members ───────────────────────────────────────────── */}
            {members.length > 0 && (
              <div className="fade-up" style={{ animationDelay: '240ms' }}>
                {/* Section header with fading dividers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04))' }} />
                  <div style={{
                    fontFamily: 'Geist Mono, monospace', fontSize: 9, color: '#8a6a4a',
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                  }}>
                    Members
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.04), transparent)' }} />
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
              </div>
            )}

            {members.length === 0 && (
              <div style={{
                textAlign: 'center', paddingTop: 80,
                fontFamily: 'Geist, sans-serif', fontSize: 14, color: '#8a6a4a',
              }}>
                No members yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
