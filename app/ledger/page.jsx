'use client'

import { useState, useEffect } from 'react'
import { fmtEUR } from '@/lib/format'

function LeaderCard({ title, icon, name, value, valueColor, sub, style: extraStyle }) {
  return (
    <div style={{ ...leaderCard, ...extraStyle }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={leaderCardTitle}>{title}</div>
        <span style={{ fontSize: '16px' }}>{icon}</span>
      </div>
      <div style={{ ...leaderCardValue, color: valueColor }}>{value}</div>
      <div style={leaderCardName}>{name}</div>
    </div>
  )
}

export default function LedgerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/ledger')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={pageStyle}>
      <p style={labelStyle}>LEDGER</p>
      <p style={{ color: '#4a5270', fontFamily: 'monospace', fontSize: '13px' }}>Loading...</p>
    </div>
  )

  if (error) return (
    <div style={pageStyle}>
      <p style={labelStyle}>LEDGER</p>
      <p style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '13px' }}>{error}</p>
    </div>
  )

  const members = data?.members ?? []
  const fundStats = data?.fundStats ?? {}

  const leaderboard = members.length > 0 ? {
    mostProfitable: [...members].sort((a, b) => b.totalNetEur - a.totalNetEur)[0],
    bestWinRate: [...members]
      .filter(m => m.tradeCount >= 3)
      .sort((a, b) => b.winRate - a.winRate)[0] ?? null,
    bestSingleTrade: [...members]
      .filter(m => m.bestTrade)
      .sort((a, b) => b.bestTrade.net_eur - a.bestTrade.net_eur)[0] ?? null,
    mostActive: [...members].sort((a, b) => b.tradeCount - a.tradeCount)[0],
    bestThisMonth: [...members].sort((a, b) => b.thisMonthNet - a.thisMonthNet)[0],
  } : null

  return (
    <div style={pageStyle}>
      <p style={labelStyle}>LEDGER</p>

      {/* Fund Overview */}
      <div style={overviewCard}>
        <div style={overviewLabel}>FUND OVERVIEW</div>
        <div style={overviewGrid}>
          <div style={overviewStat}>
            <div style={overviewStatLabel}>TOTAL NET</div>
            <div style={{ ...overviewStatValue, color: (fundStats.totalNetEur ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {fmtEUR(fundStats.totalNetEur ?? 0)}
            </div>
          </div>
          <div style={overviewStat}>
            <div style={overviewStatLabel}>TOTAL TRADES</div>
            <div style={overviewStatValue}>{fundStats.totalTrades ?? 0}</div>
          </div>
          <div style={overviewStat}>
            <div style={overviewStatLabel}>FUND WIN RATE</div>
            <div style={overviewStatValue}>{fundStats.fundWinRate !== null && fundStats.fundWinRate !== undefined ? `${fundStats.fundWinRate}%` : '—'}</div>
          </div>
          <div style={overviewStat}>
            <div style={overviewStatLabel}>OPEN POSITIONS</div>
            <div style={overviewStatValue}>{fundStats.totalOpenPositions ?? 0}</div>
          </div>
        </div>

        {fundStats.bestTradeEver && (
          <div style={bestTradeBanner}>
            <span style={{ color: '#f59e0b', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>★ BEST TRADE EVER</span>
            <span style={{ color: '#e8eaf6', fontSize: '13px', marginLeft: '10px' }}>
              {fundStats.bestTradeEver.memberName} — {fmtEUR(fundStats.bestTradeEver.net_eur)}
            </span>
            <span style={{ color: '#4a5270', fontSize: '11px', marginLeft: '8px' }}>
              {fundStats.bestTradeEver.shares}sh @ ${fundStats.bestTradeEver.buy_price} → ${fundStats.bestTradeEver.sell_price}
            </span>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leaderboard && (
        <div style={{ marginBottom: '16px' }}>
          <div style={sectionHeader}>LEADERBOARD</div>
          <div style={leaderboardGrid}>

            <LeaderCard
              title='MOST PROFITABLE'
              icon='💰'
              name={leaderboard.mostProfitable?.name}
              value={fmtEUR(leaderboard.mostProfitable?.totalNetEur)}
              valueColor='#22c55e'
              sub='all time'
            />

            <LeaderCard
              title='BEST WIN RATE'
              icon='🎯'
              name={leaderboard.bestWinRate?.name ?? '—'}
              value={leaderboard.bestWinRate ? `${leaderboard.bestWinRate.winRate}%` : 'min 3 trades'}
              valueColor='#7b8cde'
              sub='min 3 trades'
            />

            <LeaderCard
              title='BEST SINGLE TRADE'
              icon='⚡'
              name={leaderboard.bestSingleTrade?.name ?? '—'}
              value={leaderboard.bestSingleTrade ? fmtEUR(leaderboard.bestSingleTrade.bestTrade.net_eur) : '—'}
              valueColor='#f59e0b'
              sub='highest net EUR'
            />

            <LeaderCard
              title='MOST ACTIVE'
              icon='🔥'
              name={leaderboard.mostActive?.name}
              value={`${leaderboard.mostActive?.tradeCount} trades`}
              valueColor='#e8eaf6'
              sub='total trades'
            />

            <LeaderCard
              title='BEST THIS MONTH'
              icon='📅'
              name={leaderboard.bestThisMonth?.name}
              value={fmtEUR(leaderboard.bestThisMonth?.thisMonthNet)}
              valueColor={leaderboard.bestThisMonth?.thisMonthNet >= 0 ? '#22c55e' : '#ef4444'}
              sub={new Date().toLocaleString('default', { month: 'long' })}
              style={{ gridColumn: 'span 2' }}
            />

          </div>
        </div>
      )}

      {/* Member cards */}
      {members.map((member, i) => (
        <div key={member.userId} style={memberCard}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={rankBadge}>#{i + 1}</div>
              <div>
                <div style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 500 }}>{member.name}</div>
                <div style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>
                  {member.tradeCount} trades · {member.winRate !== null ? `${member.winRate}% win rate` : 'no trades yet'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: member.totalNetEur >= 0 ? '#22c55e' : '#ef4444', fontSize: '16px', fontWeight: 500, fontFamily: 'monospace' }}>
                {fmtEUR(member.totalNetEur)}
              </div>
              <div style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>total net</div>
            </div>
          </div>

          {/* Open positions */}
          {member.openPositions.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={sectionLabel}>OPEN NOW</div>
              {member.openPositions.map((pos, j) => (
                <div key={j} style={positionRow}>
                  <span style={{ color: '#7b8cde', fontSize: '11px', fontFamily: 'monospace' }}>{pos.type}</span>
                  <span style={{ color: '#c8cce8', fontSize: '11px' }}>{pos.shares} shares @ ${pos.entryPrice}</span>
                  <span style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>
                    {Math.floor((Date.now() - new Date(pos.entryDate)) / 86400000)}d held
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent trades toggle */}
          {member.recentTrades.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(expanded === member.userId ? null : member.userId)}
                style={toggleButton}
              >
                Recent trades {expanded === member.userId ? '▲' : '▼'}
              </button>
              {expanded === member.userId && (
                <div style={{ marginTop: '8px' }}>
                  {member.recentTrades.map((trade, j) => (
                    <div key={j} style={tradeRow}>
                      <span style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>{trade.sell_date}</span>
                      <span style={{ color: '#7b8cde', fontSize: '10px', fontFamily: 'monospace' }}>{trade.type}</span>
                      <span style={{ color: '#c8cce8', fontSize: '11px' }}>{trade.shares}sh</span>
                      <span style={{ color: trade.net_eur >= 0 ? '#22c55e' : '#ef4444', fontSize: '11px', fontFamily: 'monospace', fontWeight: 500 }}>
                        {fmtEUR(trade.net_eur)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {members.length === 0 && (
        <p style={{ color: '#4a5270', fontFamily: 'monospace', fontSize: '13px' }}>No members yet.</p>
      )}
    </div>
  )
}

// Styles
const pageStyle = { minHeight: '100vh', background: '#080910', color: '#e8eaf6', padding: '24px 16px 96px', maxWidth: '480px', margin: '0 auto' }
const labelStyle = { fontFamily: 'monospace', fontSize: '11px', color: '#4a5270', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }
const memberCard = { background: '#0d1018', border: '0.5px solid #1a1f2e', borderRadius: '8px', padding: '14px', marginBottom: '10px' }
const rankBadge = { width: '24px', height: '24px', borderRadius: '50%', background: '#1a1f2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '11px', color: '#4a5270' }
const sectionLabel = { fontFamily: 'monospace', fontSize: '9px', color: '#4a5270', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }
const positionRow = { display: 'flex', gap: '10px', alignItems: 'center', padding: '4px 0', borderBottom: '0.5px solid #12151f' }
const toggleButton = { background: 'none', border: 'none', color: '#4a5270', fontFamily: 'monospace', fontSize: '10px', cursor: 'pointer', padding: '4px 0', letterSpacing: '0.05em' }
const tradeRow = { display: 'flex', gap: '10px', alignItems: 'center', padding: '4px 0', borderBottom: '0.5px solid #12151f' }
const overviewCard = { background: '#0d1018', border: '0.5px solid #1a1f2e', borderRadius: '8px', padding: '16px', marginBottom: '16px' }
const overviewLabel = { fontFamily: 'monospace', fontSize: '9px', color: '#4a5270', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }
const overviewStat = { background: '#080910', borderRadius: '6px', padding: '10px' }
const overviewStatLabel = { fontFamily: 'monospace', fontSize: '9px', color: '#4a5270', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }
const overviewStatValue = { fontFamily: 'monospace', fontSize: '20px', fontWeight: 500, color: '#e8eaf6' }
const bestTradeBanner = { background: '#12100a', border: '0.5px solid #3a2a0a', borderRadius: '6px', padding: '8px 12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }
const sectionHeader = { fontFamily: 'monospace', fontSize: '9px', color: '#4a5270', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }
const leaderboardGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }
const leaderCard = { background: '#0d1018', border: '0.5px solid #1a1f2e', borderRadius: '8px', padding: '12px' }
const leaderCardTitle = { fontFamily: 'monospace', fontSize: '8px', color: '#4a5270', letterSpacing: '0.1em', textTransform: 'uppercase' }
const leaderCardValue = { fontFamily: 'monospace', fontSize: '18px', fontWeight: 500, margin: '6px 0 2px' }
const leaderCardName = { fontFamily: 'monospace', fontSize: '10px', color: '#7b8cde' }
