'use client'

import { useState, useEffect, useRef } from 'react'
import { fmtEUR } from '@/lib/format'
import { calculateEstimatedPnL } from '@/lib/calculations'
import { useNVDALive } from '@/context/NVDALiveContext'

// ─── easeOutExpo ─────────────────────────────────────────────────────────────
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }

// ─── useCountUp ──────────────────────────────────────────────────────────────
function useCountUp(target, duration = 800, delay = 0) {
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

// ─── Initials helper ─────────────────────────────────────────────────────────
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
*, *::before, *::after { box-sizing: border-box; }

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
  will-change: transform;
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
  background: #13131e;
  border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
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
  box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
}

.member-card {
  background: #13131e;
  border: 0.5px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 8px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  transition: border-color 0.2s cubic-bezier(0.16,1,0.3,1);
}
.member-card.no-trades { cursor: default; }
.member-card.rank-1 {
  border-left: 2px solid rgba(59,130,246,0.3);
  background: linear-gradient(135deg, #141422 0%, #111120 100%);
}
.member-card.is-open {
  border-radius: 14px 14px 0 0;
  border-bottom-color: transparent;
  margin-bottom: 0;
}

.trade-panel {
  background: #0d0d18;
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
function Avatar({ name, size = 48, highlight = false }) {
  const inits = getInitials(name || '')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'rgba(59,130,246,0.12)',
      border: '0.5px solid rgba(59,130,246,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      fontSize: Math.round(size * 0.34),
      fontWeight: '500',
      color: 'rgba(255,255,255,0.8)',
      boxShadow: highlight
        ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 2px rgba(59,130,246,0.2), 0 0 16px rgba(59,130,246,0.15)'
        : '0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px rgba(59,130,246,0.1)',
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
  const netVal = useCountUp(started ? (member?.totalNetEur ?? 0) : 0, 800, delay)

  const statFontSize = isFirst ? 18 : 13

  const cardBg = rank === 1
    ? 'linear-gradient(145deg, #1e1e2e 0%, #16162a 50%, #1a1a2e 100%)'
    : rank === 2
    ? 'linear-gradient(145deg, #191927 0%, #141420 100%)'
    : 'linear-gradient(145deg, #161622 0%, #111119 100%)'

  const cardBorder = rank === 1
    ? '0.5px solid rgba(255,255,255,0.12)'
    : rank === 2
    ? '0.5px solid rgba(255,255,255,0.07)'
    : '0.5px solid rgba(255,255,255,0.05)'

  const cardShadow = rank === 1
    ? '0 -8px 40px rgba(59,130,246,0.12), 0 0 0 0.5px rgba(59,130,246,0.15), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 40px rgba(59,130,246,0.04)'
    : rank === 2
    ? '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)'
    : '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'

  const ghostColor = rank === 1
    ? 'rgba(59,130,246,0.08)'
    : rank === 2
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.03)'

  return (
    <div style={{ flex: isFirst ? '1.4' : '1', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
      {/* Avatar floating above */}
      <div style={{ marginBottom: -4, position: 'relative', zIndex: 10 }}>
        {member
          ? <Avatar name={member.name} size={avatarSize} highlight={isFirst} />
          : <div style={{
              width: avatarSize, height: avatarSize, borderRadius: '50%',
              background: 'rgba(59,130,246,0.05)',
              border: '0.5px dashed rgba(59,130,246,0.15)',
            }} />
        }
      </div>

      {/* Card + Platform */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
        {/* Pod card */}
        <div
          className="pod-card-tilt"
          style={{
            width: '100%', minHeight: cardMinH,
            padding: 'clamp(12px,2.5vw,28px) clamp(10px,2vw,24px)',
            borderRadius: '20px 20px 0 0',
            position: 'relative', zIndex: 1,
            background: cardBg,
            border: cardBorder,
            boxShadow: cardShadow,
          }}
        >
          {/* Ghost watermark */}
          <div style={{
            position: 'absolute',
            bottom: -20, right: 8,
            fontSize: 120, fontWeight: '600',
            color: ghostColor,
            lineHeight: 1,
            pointerEvents: 'none', userSelect: 'none',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-8px',
            zIndex: 0,
          }}>{rank}</div>

          <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {member ? (
              <>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600,
                  color: 'rgba(255,255,255,0.92)', marginBottom: 3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {member.name}
                </div>
                <div style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 400,
                  color: 'rgba(255,255,255,0.35)', marginBottom: 16, textTransform: 'capitalize',
                }}>
                  {member.role || 'Trader'}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: statFontSize, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>{netVal < 0 ? '-€' : '+€'}</span>
                      <span style={{ color: netVal >= 0 ? '#22c55e' : '#ef4444' }}>
                        {Math.abs(netVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.04em' }}>P&L</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: statFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>
                      {member.winRate != null ? `${member.winRate}%` : '—'}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.04em' }}>WIN</div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', margin: '0 6px' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: statFontSize, fontWeight: 500, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>
                      {member.tradeCount}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.04em' }}>TRADES</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  border: '0.5px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.1)' }}>{rank}</span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>Waiting for member</span>
              </div>
            )}
          </div>
        </div>

        {/* Platform base */}
        <div style={{
          width: '100%',
          height: rank === 1 ? '44px' : '30px',
          marginTop: '-4px',
          borderRadius: '0 0 14px 14px',
          background: 'linear-gradient(180deg, #0f0f1a 0%, #0a0a12 100%)',
          border: '0.5px solid rgba(255,255,255,0.06)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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
  const counted = useCountUp(started ? (rawValue ?? 0) : 0, 1000, 400 + delay)
  return (
    <div className="cat-card" style={{ '--cat-accent': color }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 400,
        color: 'rgba(255,255,255,0.25)', letterSpacing: '0.18em',
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 500,
        color, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.5px',
      }}>
        {formatValue(counted)}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 300,
        color: 'rgba(255,255,255,0.5)', marginBottom: runners.length > 0 ? 10 : 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {winner}
      </div>
      {runners.length > 0 && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {runners.slice(0, 3).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  padding: '1px 6px', borderRadius: '9999px', flexShrink: 0,
                }}>
                  {i + 2}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {r.name}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
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
        el.style.transition = 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)'
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
            fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 600,
            color: 'rgba(255,255,255,0.2)',
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
                fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
                color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {member.name}
              </span>
              {isFirst && (
                <span style={{
                  background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.2)',
                  borderRadius: '9999px', padding: '2px 8px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                  color: '#22c55e', letterSpacing: '0.1em', flexShrink: 0,
                }}>
                  WINNING
                </span>
              )}
              {!isFirst && member.winStreak >= 2 && (
                <span style={{
                  background: 'rgba(34,197,94,0.05)', border: '0.5px solid rgba(34,197,94,0.12)',
                  borderRadius: '9999px', padding: '2px 6px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                  color: 'rgba(34,197,94,0.5)', letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  {member.winStreak}W
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
              {member.tradeCount} trades
              {member.winRate != null ? ` · ${member.winRate}%` : ''}
              {' · '}
              <span style={{ color: member.thisMonthNet >= 0 ? 'rgba(34,197,94,0.65)' : 'rgba(239,68,68,0.65)' }}>
                {member.thisMonthNet >= 0 ? '+' : ''}{fmtEUR(member.thisMonthNet)} mo
              </span>
            </div>
          </div>

          {/* Total */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 500,
              color: member.totalNetEur >= 0 ? '#22c55e' : '#ef4444',
            }}>
              {fmtEUR(member.totalNetEur)}
            </div>
            {hasTrades && (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
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
            fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
            color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase',
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
                borderLeft: `2px solid ${t.net_eur >= 0 ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{t.sell_date}</span>
              <span style={{ color: 'rgba(59,130,246,0.6)' }}>{t.type}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>{t.shares}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>${t.buy_price}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>${t.sell_price}</span>
              <span style={{ color: t.net_eur >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                {fmtEUR(t.net_eur)}
              </span>
            </div>
          ))}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', padding: '8px 16px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)',
          }}>
            <span>{member.tradeCount} trades · {member.winRate ?? '—'}% win</span>
            <span style={{ color: member.totalNetEur >= 0 ? '#22c55e' : '#ef4444' }}>
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
  const { livePrice } = useNVDALive()

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

  const heroVal = useCountUp(started ? (fundStats?.totalNetEur ?? 0) : 0, 900, 300)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d14',
      backgroundImage: `
        radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.08) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 80%, rgba(99,40,217,0.06) 0%, transparent 60%)
      `,
      marginTop: '-68px',
      paddingTop: '68px',
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
                background: 'rgba(59,130,246,0.3)',
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(239,68,68,0.5)', paddingTop: 60 }}>
            {error}
          </div>
        )}

        {/* Main content */}
        {!loading && !error && (
          <>
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="fade-up" style={{ animationDelay: '0ms', marginBottom: 48 }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 400,
                color: 'rgba(255,255,255,0.25)', letterSpacing: '0.25em', textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Fund
              </div>

              {/* Hero total */}
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: '72px',
                fontWeight: '600', letterSpacing: '-2px', color: '#f0f0f8',
                lineHeight: 1, marginBottom: 20,
              }}>
                <span style={{
                  fontSize: '32px', fontWeight: '300', color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'Inter, sans-serif', verticalAlign: 'top',
                  marginTop: '8px', display: 'inline-block',
                }}>€</span>
                {heroVal < 0 ? '-' : ''}
                {Math.abs(heroVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Three inline stats */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.35)',
                display: 'flex', alignItems: 'center', gap: 8,
                flexWrap: 'wrap', marginBottom: 20,
              }}>
                <span>{fundStats.totalTrades ?? 0} trades</span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span>{fundStats.fundWinRate != null ? `${fundStats.fundWinRate}% win rate` : '—'}</span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span>{fundStats.totalOpenPositions ?? 0} open positions</span>
              </div>

              {/* Best trade strip */}
              {fundStats.bestTradeEver && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  background: 'rgba(34,197,94,0.06)', border: '0.5px solid rgba(34,197,94,0.15)',
                  borderRadius: '9999px', padding: '8px 14px',
                }}>
                  <span style={{ color: '#22c55e', fontSize: 14 }}>★</span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
                    {fundStats.bestTradeEver.memberName}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#22c55e' }}>
                    +€{fundStats.bestTradeEver.net_eur?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {fundStats.bestTradeEver.buy_price && (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
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
                    color="#22c55e"
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
                    color="rgba(59,130,246,0.85)"
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
                    color="#22c55e"
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
                    color="rgba(255,255,255,0.7)"
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
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)',
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
                fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.2)',
              }}>
                No members yet.
              </div>
            )}

            {/* ── All open positions ────────────────────────────────── */}
            {data?.allOpenPositions?.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '18px',
                padding: '20px 24px',
                marginTop: '24px',
                boxShadow: `
                  0 12px 40px rgba(0,0,0,0.5),
                  0 4px 16px rgba(0,0,0,0.3),
                  inset 0 1px 0 rgba(255,255,255,0.07)
                `,
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'rgba(59,130,246,0.5)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '16px',
                }}>All Open Positions</span>

                {data.allOpenPositions.map((pos, i) => {
                  const estimated = livePrice
                    ? calculateEstimatedPnL(pos, livePrice)
                    : null
                  return (
                    <div
                      key={pos.id ?? i}
                      style={{
                        padding: '12px 0',
                        borderBottom: i < data.allOpenPositions.length - 1
                          ? '0.5px solid rgba(255,255,255,0.04)'
                          : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'rgba(255,255,255,0.85)',
                          }}>{pos.shares?.toLocaleString()} shares</span>
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
                          ${pos.entryPrice} entry · {pos.entryDate} · {estimated?.daysHeld ?? 0}d held
                        </div>
                        {pos.memberName && (
                          <div style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.45)',
                            marginTop: '3px',
                          }}>{pos.memberName}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexShrink: 0 }}>
                        {estimated && (
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
                                color: estimated.estimatedGross >= 0 ? '#22c55e' : '#ef4444',
                                letterSpacing: '-0.3px',
                              }}>
                                {estimated.estimatedGross >= 0 ? '+' : ''}${Math.round(estimated.estimatedGross).toLocaleString()}
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
                                color: estimated.estimatedNetEur >= 0 ? '#22c55e' : '#ef4444',
                                letterSpacing: '-0.3px',
                              }}>
                                {estimated.estimatedNetEur >= 0 ? '+' : ''}€{Math.round(estimated.estimatedNetEur).toLocaleString()}
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
                                -${Math.round(estimated.totalCosts).toLocaleString()}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
