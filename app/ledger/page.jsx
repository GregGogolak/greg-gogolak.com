'use client'

import { useState, useEffect, useRef } from 'react'
import { fmtEUR } from '@/lib/format'

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!target || target === 0) { setValue(0); return }
    const timeout = setTimeout(() => {
      const start = performance.now()
      const tick = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 4)
        setValue(Math.round(target * eased * 100) / 100)
        if (progress < 1) requestAnimationFrame(tick)
        else setValue(target)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

// ─── useFadeUp ────────────────────────────────────────────────────────────────
function useFadeUp(delay = 0) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    const t = setTimeout(() => {
      el.style.transition = `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 150)
    return () => clearTimeout(t)
  }, [delay])
  return ref
}

// ─── HeroSection ──────────────────────────────────────────────────────────────
function HeroSection({ fundStats, started }) {
  const ref = useFadeUp(0)
  const totalNetEur = fundStats.totalNetEur ?? 0
  const animatedTotal = useCountUp(started ? (totalNetEur ?? 0) : 0, 1400)

  return (
    <div
      ref={ref}
      style={{
        background: '#18181b',
        border: '0.5px solid #27272a',
        borderTop: '2px solid #6366f1',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '12px',
      }}
    >
      <div style={{
        fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px',
      }}>
        Fund Overview
      </div>

      {/* Hero animated number */}
      <div
        className="hero-number"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '42px',
          fontWeight: '600',
          color: totalNetEur >= 0 ? '#10b981' : '#f43f5e',
          lineHeight: 1,
          marginBottom: '16px',
        }}
      >
        {animatedTotal >= 0 ? '+' : ''}€{Math.abs(animatedTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { label: 'Trades', value: fundStats.totalTrades ?? 0 },
          { label: 'Win rate', value: fundStats.fundWinRate != null ? `${fundStats.fundWinRate}%` : '—' },
          { label: 'Open pos', value: fundStats.totalOpenPositions ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#27272a', borderRadius: '6px', padding: '6px 12px' }}>
            <div style={{
              fontSize: '9px', color: '#52525b', fontFamily: 'monospace',
              letterSpacing: '0.1em', marginBottom: '2px',
            }}>
              {label.toUpperCase()}
            </div>
            <div style={{
              fontSize: '16px', color: '#fafafa',
              fontFamily: '"JetBrains Mono", monospace', fontWeight: '500',
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Best trade ever */}
      {fundStats.bestTradeEver && (
        <div style={{
          marginTop: '12px',
          background: '#1c1500',
          border: '0.5px solid rgba(245,158,11,0.3)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', color: '#f59e0b', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            ★ BEST TRADE EVER
          </span>
          <span style={{ fontSize: '13px', color: '#fafafa' }}>
            {fundStats.bestTradeEver.memberName}
          </span>
          <span style={{
            fontSize: '13px', color: '#10b981',
            fontFamily: '"JetBrains Mono", monospace', fontWeight: '600',
          }}>
            {fmtEUR(fundStats.bestTradeEver.net_eur)}
          </span>
          <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>
            {fundStats.bestTradeEver.shares}sh @ ${fundStats.bestTradeEver.buy_price} → ${fundStats.bestTradeEver.sell_price}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── LeaderCard ───────────────────────────────────────────────────────────────
function LeaderCard({ title, icon, topColor, rawValue, formatValue, winners, runners, delay = 0, started }) {
  const ref = useFadeUp(delay)
  const counted = useCountUp(started ? (rawValue ?? 0) : 0, 1000)

  return (
    <div
      ref={ref}
      style={{
        background: '#18181b',
        border: '0.5px solid #27272a',
        borderTop: `2px solid ${topColor}`,
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Category + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{
          fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {title}
        </div>
        <span style={{ fontSize: '16px', opacity: 0.5 }}>{icon}</span>
      </div>

      {/* Animated winner value */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '28px', fontWeight: '600',
        color: topColor, lineHeight: 1, marginBottom: '6px',
      }}>
        {formatValue(counted)}
      </div>

      {/* Winner name(s) */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px',
        marginBottom: runners.length > 0 ? '10px' : '0',
      }}>
        {winners.map((name, i) => (
          <span key={i} style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px', color: '#6366f1',
          }}>
            {name}{winners.length > 1 && i < winners.length - 1 ? ' ·' : ''}
          </span>
        ))}
        {winners.length > 1 && (
          <span style={{
            fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
            background: '#27272a', borderRadius: '3px', padding: '1px 5px',
          }}>
            TIED
          </span>
        )}
      </div>

      {/* Runner-up list */}
      {runners.length > 0 && (
        <div style={{
          borderTop: '0.5px solid #27272a', paddingTop: '10px',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {runners.slice(0, 4).map((runner, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: '11px', color: '#52525b',
                  background: '#27272a', borderRadius: '4px',
                  padding: '1px 6px', minWidth: '28px', textAlign: 'center',
                }}>
                  #{i + 2}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#71717a' }}>
                  {runner.name}
                </span>
              </div>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '11px', color: '#71717a',
              }}>
                {runner.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MemberCard ───────────────────────────────────────────────────────────────
function MemberCard({ member, rank, leaderboard, isExpanded, onToggle, delay = 0 }) {
  const ref = useFadeUp(delay)
  const tradeListRef = useRef(null)
  const trades = member.allTrades ?? member.recentTrades
  const isWinning =
    leaderboard?.bestThisMonth?.some(m => m.userId === member.userId) &&
    member.thisMonthNet > 0

  useEffect(() => {
    if (isExpanded && tradeListRef.current) {
      const rows = tradeListRef.current.querySelectorAll('.stagger-row')
      rows.forEach((el, i) => {
        el.style.opacity = '0'
        el.style.transform = 'translateX(-10px)'
        setTimeout(() => {
          el.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
          el.style.opacity = '1'
          el.style.transform = 'translateX(0)'
        }, i * 35)
      })
    }
  }, [isExpanded])

  return (
    <div
      ref={ref}
      className="member-card"
      style={{
        background: '#18181b',
        border: '0.5px solid #27272a',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '10px',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>

          {/* Rank badge */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#27272a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', fontSize: '11px', color: '#6366f1',
            flexShrink: 0, marginTop: '2px',
          }}>
            {rank}
          </div>

          <div>
            {/* Name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: '500', color: '#fafafa' }}>
                {member.name}
              </span>
              {member.winStreak >= 2 && (
                <span style={{
                  background: '#1c0f00',
                  border: '0.5px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b', fontSize: '9px',
                  padding: '2px 7px', borderRadius: '4px',
                  fontFamily: 'monospace',
                }}>
                  ★ {member.winStreak} streak
                </span>
              )}
              {isWinning && (
                <span style={{
                  background: '#0a1f14',
                  border: '0.5px solid rgba(16,185,129,0.3)',
                  color: '#10b981', fontSize: '9px',
                  padding: '2px 7px', borderRadius: '4px',
                  fontFamily: 'monospace',
                }}>
                  ▲ winning
                </span>
              )}
            </div>

            {/* Sub-stats */}
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#52525b' }}>
              {member.tradeCount} trades
              {member.winRate !== null ? ` · ${member.winRate}% win` : ''}
              {' · '}
              <span style={{ color: member.thisMonthNet >= 0 ? '#10b981' : '#f43f5e' }}>
                {member.thisMonthNet >= 0 ? '+' : ''}{fmtEUR(member.thisMonthNet)} this month
              </span>
            </div>
          </div>
        </div>

        {/* Total net */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '18px', fontWeight: '600',
            color: member.totalNetEur >= 0 ? '#10b981' : '#f43f5e',
          }}>
            {fmtEUR(member.totalNetEur)}
          </div>
          <div style={{ fontSize: '9px', color: '#52525b', fontFamily: 'monospace' }}>
            total net
          </div>
        </div>
      </div>

      {/* Open positions */}
      {member.openPositions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {member.openPositions.map((pos, j) => (
            <span key={j} style={{
              background: '#27272a', borderRadius: '4px',
              padding: '2px 8px', fontSize: '10px',
              color: '#a1a1aa', fontFamily: 'monospace',
            }}>
              {pos.type} {pos.shares}sh @ ${pos.entryPrice}
            </span>
          ))}
        </div>
      )}

      {/* Expand / collapse button */}
      {member.tradeCount > 0 && (
        <button
          onClick={onToggle}
          style={{
            marginTop: '10px',
            background: 'none', border: 'none',
            color: '#52525b', fontFamily: 'monospace', fontSize: '10px',
            cursor: 'pointer', padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: '4px',
            letterSpacing: '0.05em', transition: 'color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
          onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
        >
          <span style={{
            display: 'inline-block',
            transition: 'transform 0.25s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}>
            ▶
          </span>
          {isExpanded ? 'hide trades' : `show all trades (${member.tradeCount})`}
        </button>
      )}

      {/* Trade history — max-height expand */}
      {member.tradeCount > 0 && (
        <div
          ref={tradeListRef}
          style={{
            overflow: 'hidden',
            maxHeight: isExpanded ? '3000px' : '0',
            transition: 'max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            marginTop: isExpanded ? '10px' : '0',
          }}
        >
          <div style={{ borderTop: '0.5px solid #27272a', marginTop: '10px', paddingTop: '10px' }}>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '90px 70px 60px 70px 70px 1fr',
              gap: '4px',
              padding: '8px 0',
              fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              borderBottom: '0.5px solid #27272a',
              marginBottom: '4px',
            }}>
              <span>DATE</span>
              <span>TYPE</span>
              <span>SHARES</span>
              <span>ENTRY</span>
              <span>EXIT</span>
              <span>NET EUR</span>
            </div>

            {/* Trade rows — scrollable on mobile */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '430px' }}>
                {trades.map((trade, j) => (
                  <div
                    key={j}
                    className="stagger-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '90px 70px 60px 70px 70px 1fr',
                      gap: '4px',
                      padding: '7px 8px 7px 10px',
                      borderBottom: '0.5px solid #27272a',
                      borderLeft: `2px solid ${trade.net_eur >= 0 ? '#10b981' : '#f43f5e'}`,
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ color: '#52525b' }}>{trade.sell_date}</span>
                    <span style={{ color: '#6366f1' }}>{trade.type}</span>
                    <span style={{ color: '#a1a1aa' }}>{trade.shares}</span>
                    <span style={{ color: '#a1a1aa' }}>${trade.buy_price}</span>
                    <span style={{ color: '#a1a1aa' }}>${trade.sell_price}</span>
                    <span style={{
                      color: trade.net_eur >= 0 ? '#10b981' : '#f43f5e',
                      fontWeight: '500',
                    }}>
                      {fmtEUR(trade.net_eur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0 4px',
              borderTop: '0.5px solid #27272a',
              marginTop: '4px',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#52525b' }}>
                {member.tradeCount} trades · {member.winRate}% win rate
              </span>
              <span style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '12px', fontWeight: '500',
                color: member.totalNetEur >= 0 ? '#10b981' : '#f43f5e',
              }}>
                {fmtEUR(member.totalNetEur)} total
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LedgerPage ───────────────────────────────────────────────────────────────
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
    if (data && !started) {
      setTimeout(() => setStarted(true), 100)
    }
  }, [data])

  const pageStyle = {
    minHeight: '100vh',
    background: '#09090b',
    color: '#fafafa',
    padding: '24px 16px 96px',
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily: 'Inter, sans-serif',
  }

  const titleStyle = {
    fontFamily: 'monospace', fontSize: '11px', color: '#52525b',
    letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px',
  }

  if (loading) return (
    <div style={pageStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');`}</style>
      <div style={titleStyle}>Ledger</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '40px 0' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#52525b' }}>
          Loading ledger...
        </span>
      </div>
    </div>
  )

  if (error) return (
    <div style={pageStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');`}</style>
      <div style={titleStyle}>Ledger</div>
      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f43f5e' }}>{error}</span>
    </div>
  )

  const members = data?.members ?? []
  const fundStats = data?.fundStats ?? {}

  // ── Leaderboard — computed client-side (unchanged logic) ───────────────────
  const leaderboard = members.length > 0 ? {
    mostProfitable: (() => {
      const top = Math.max(...members.map(m => m.totalNetEur))
      return members.filter(m => m.totalNetEur === top)
    })(),
    bestWinRate: (() => {
      const qualified = members.filter(m => m.tradeCount >= 3)
      if (qualified.length === 0) return []
      const top = Math.max(...qualified.map(m => m.winRate))
      return qualified.filter(m => m.winRate === top)
    })(),
    bestSingleTrade: (() => {
      const withTrades = members.filter(m => m.bestTrade)
      if (withTrades.length === 0) return []
      const top = Math.max(...withTrades.map(m => m.bestTrade.net_eur))
      return withTrades.filter(m => m.bestTrade.net_eur === top)
    })(),
    mostActive: (() => {
      const top = Math.max(...members.map(m => m.tradeCount))
      return members.filter(m => m.tradeCount === top)
    })(),
    bestThisMonth: (() => {
      const top = Math.max(...members.map(m => m.thisMonthNet))
      return members.filter(m => m.thisMonthNet === top)
    })(),
  } : null

  // EUR formatter for animated values
  const fmtCounted = (v) => {
    const abs = Math.abs(v)
    const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return (v < 0 ? '-€' : '€') + str
  }

  return (
    <div style={pageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500&display=swap');
        @media (min-width: 640px) {
          .leaderboard-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }
        }
        .member-card { transition: border-color 0.2s ease; }
        .member-card:hover { border-color: #3f3f46 !important; }
        @keyframes heroPulse {
          0%, 100% { text-shadow: 0 0 0px transparent; }
          50% { text-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
        }
        .hero-number { animation: heroPulse 3s ease-in-out infinite; animation-delay: 1.5s; }
      `}</style>

      {/* Page title */}
      <div style={titleStyle}>Ledger</div>

      {/* ── Section A: Hero ── */}
      <HeroSection fundStats={fundStats} started={started} />

      {/* ── Section B: Leaderboard ── */}
      {leaderboard && (
        <>
          <div style={{
            fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
            letterSpacing: '0.15em', textTransform: 'uppercase',
            margin: '16px 0 10px',
          }}>
            Leaderboard
          </div>

          <div
            className="leaderboard-grid"
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <LeaderCard
              title="Most Profitable"
              icon="💰"
              topColor="#10b981"
              rawValue={leaderboard.mostProfitable[0]?.totalNetEur ?? 0}
              formatValue={fmtCounted}
              winners={leaderboard.mostProfitable.map(m => m.name)}
              runners={[...members]
                .sort((a, b) => b.totalNetEur - a.totalNetEur)
                .filter(m => !leaderboard.mostProfitable.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.totalNetEur) }))}
              delay={0}
              started={started}
            />

            <LeaderCard
              title="Best Win Rate"
              icon="🎯"
              topColor="#6366f1"
              rawValue={leaderboard.bestWinRate[0]?.winRate ?? 0}
              formatValue={v =>
                leaderboard.bestWinRate.length > 0 ? `${Math.round(v)}%` : '—'
              }
              winners={
                leaderboard.bestWinRate.length > 0
                  ? leaderboard.bestWinRate.map(m => m.name)
                  : ['min 3 trades']
              }
              runners={[...members]
                .filter(m => m.tradeCount >= 3)
                .sort((a, b) => b.winRate - a.winRate)
                .filter(m => !leaderboard.bestWinRate.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: `${m.winRate}%` }))}
              delay={80}
              started={started}
            />

            <LeaderCard
              title="Best Single Trade"
              icon="⚡"
              topColor="#f59e0b"
              rawValue={leaderboard.bestSingleTrade[0]?.bestTrade?.net_eur ?? 0}
              formatValue={v =>
                leaderboard.bestSingleTrade.length > 0 ? fmtCounted(v) : '—'
              }
              winners={
                leaderboard.bestSingleTrade.length > 0
                  ? leaderboard.bestSingleTrade.map(m => m.name)
                  : ['—']
              }
              runners={[...members]
                .filter(m => m.bestTrade)
                .sort((a, b) => b.bestTrade.net_eur - a.bestTrade.net_eur)
                .filter(m => !leaderboard.bestSingleTrade.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.bestTrade.net_eur) }))}
              delay={160}
              started={started}
            />

            <LeaderCard
              title="Most Active"
              icon="🔥"
              topColor="#f43f5e"
              rawValue={leaderboard.mostActive[0]?.tradeCount ?? 0}
              formatValue={v => `${Math.round(v)} trades`}
              winners={leaderboard.mostActive.map(m => m.name)}
              runners={[...members]
                .sort((a, b) => b.tradeCount - a.tradeCount)
                .filter(m => !leaderboard.mostActive.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: `${m.tradeCount} trades` }))}
              delay={240}
              started={started}
            />

            <LeaderCard
              title="Best This Month"
              icon="📅"
              topColor="#10b981"
              rawValue={leaderboard.bestThisMonth[0]?.thisMonthNet ?? 0}
              formatValue={fmtCounted}
              winners={leaderboard.bestThisMonth.map(m => m.name)}
              runners={[...members]
                .sort((a, b) => b.thisMonthNet - a.thisMonthNet)
                .filter(m => !leaderboard.bestThisMonth.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.thisMonthNet) }))}
              delay={320}
              started={started}
            />
          </div>
        </>
      )}

      {/* ── Section C: Members label ── */}
      {members.length > 0 && (
        <div style={{
          fontFamily: 'monospace', fontSize: '9px', color: '#52525b',
          letterSpacing: '0.15em', textTransform: 'uppercase',
          margin: '16px 0 10px',
        }}>
          Members
        </div>
      )}

      {/* ── Section D: Member cards ── */}
      {members.map((member, i) => (
        <MemberCard
          key={member.userId}
          member={member}
          rank={i + 1}
          leaderboard={leaderboard}
          isExpanded={expanded === member.userId}
          onToggle={() => setExpanded(expanded === member.userId ? null : member.userId)}
          delay={i * 100}
        />
      ))}

      {members.length === 0 && (
        <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#52525b' }}>
          No members yet.
        </p>
      )}
    </div>
  )
}
