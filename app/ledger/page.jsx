'use client'

import { useState, useEffect } from 'react'
import { fmtEUR } from '@/lib/format'

function LeaderCard({ title, icon, value, valueColor, winners, style }) {
  return (
    <div style={{ ...leaderCard, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={leaderCardTitle}>{title}</div>
        <span style={{ fontSize: '16px' }}>{icon}</span>
      </div>
      <div style={{ ...leaderCardValue, color: valueColor }}>{value}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
        {winners.map((name, i) => (
          <span key={i} style={leaderCardName}>
            {name}{winners.length > 1 && i < winners.length - 1 ? ' ·' : ''}
          </span>
        ))}
        {winners.length > 1 && (
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#4a5270', marginLeft: '2px' }}>TIED</span>
        )}
      </div>
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
              winners={leaderboard.mostProfitable.map(m => m.name)}
              value={fmtEUR(leaderboard.mostProfitable[0]?.totalNetEur)}
              valueColor='#22c55e'
            />

            <LeaderCard
              title='BEST WIN RATE'
              icon='🎯'
              winners={leaderboard.bestWinRate.length > 0 ? leaderboard.bestWinRate.map(m => m.name) : ['min 3 trades']}
              value={leaderboard.bestWinRate.length > 0 ? `${leaderboard.bestWinRate[0].winRate}%` : '—'}
              valueColor='#7b8cde'
            />

            <LeaderCard
              title='BEST SINGLE TRADE'
              icon='⚡'
              winners={leaderboard.bestSingleTrade.length > 0 ? leaderboard.bestSingleTrade.map(m => m.name) : ['—']}
              value={leaderboard.bestSingleTrade.length > 0 ? fmtEUR(leaderboard.bestSingleTrade[0].bestTrade.net_eur) : '—'}
              valueColor='#f59e0b'
            />

            <LeaderCard
              title='MOST ACTIVE'
              icon='🔥'
              winners={leaderboard.mostActive.map(m => m.name)}
              value={`${leaderboard.mostActive[0]?.tradeCount} trades`}
              valueColor='#e8eaf6'
            />

            <LeaderCard
              title='BEST THIS MONTH'
              icon='📅'
              winners={leaderboard.bestThisMonth.map(m => m.name)}
              value={fmtEUR(leaderboard.bestThisMonth[0]?.thisMonthNet)}
              valueColor={leaderboard.bestThisMonth[0]?.thisMonthNet >= 0 ? '#22c55e' : '#ef4444'}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ color: '#e8eaf6', fontSize: '14px', fontWeight: 500 }}>{member.name}</div>
                  {member.winStreak >= 2 && (
                    <span style={streakBadge}>🔥 {member.winStreak} streak</span>
                  )}
                  {leaderboard?.bestThisMonth?.some(m => m.userId === member.userId) && member.thisMonthNet > 0 && (
                    <span style={winningBadge}>👑 winning</span>
                  )}
                </div>
                <div style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>
                  {member.tradeCount} trades · {member.winRate !== null ? `${member.winRate}% win rate` : 'no trades yet'}
                </div>
                <div style={{ color: member.thisMonthNet >= 0 ? '#22c55e' : '#ef4444', fontSize: '10px', fontFamily: 'monospace' }}>
                  {member.thisMonthNet >= 0 ? '+' : ''}{fmtEUR(member.thisMonthNet)} this month
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

          {/* Trade history toggle */}
          {member.tradeCount > 0 && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => setExpanded(expanded === member.userId ? null : member.userId)}
                style={toggleButton}
              >
                {expanded === member.userId ? '▲ hide trades' : `▼ show all trades (${member.tradeCount})`}
              </button>

              {expanded === member.userId && (
                <div style={{ marginTop: '10px' }}>
                  <div style={tradeHistoryHeader}>
                    <span>DATE</span>
                    <span>TYPE</span>
                    <span>SHARES</span>
                    <span>ENTRY</span>
                    <span>EXIT</span>
                    <span>NET EUR</span>
                  </div>

                  {(member.allTrades ?? member.recentTrades)
                    .map((trade, j) => (
                      <div key={j} style={{
                        ...tradeHistoryRow,
                        borderLeft: `2px solid ${trade.net_eur >= 0 ? '#22c55e' : '#ef4444'}`,
                      }}>
                        <span style={{ color: '#4a5270' }}>{trade.sell_date}</span>
                        <span style={{ color: '#7b8cde' }}>{trade.type}</span>
                        <span style={{ color: '#c8cce8' }}>{trade.shares}</span>
                        <span style={{ color: '#c8cce8' }}>${trade.buy_price}</span>
                        <span style={{ color: '#c8cce8' }}>${trade.sell_price}</span>
                        <span style={{ color: trade.net_eur >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                          {fmtEUR(trade.net_eur)}
                        </span>
                      </div>
                    ))
                  }

                  <div style={tradeSummaryRow}>
                    <span style={{ color: '#4a5270', fontSize: '10px', fontFamily: 'monospace' }}>
                      {member.tradeCount} trades · {member.winRate}% win rate
                    </span>
                    <span style={{ color: member.totalNetEur >= 0 ? '#22c55e' : '#ef4444', fontSize: '12px', fontFamily: 'monospace', fontWeight: 500 }}>
                      {fmtEUR(member.totalNetEur)} total
                    </span>
                  </div>
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
const streakBadge = { background: '#1a0e00', border: '0.5px solid #3a2000', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '9px', color: '#f59e0b' }
const winningBadge = { background: '#0a1a0a', border: '0.5px solid #1a3a1a', borderRadius: '4px', padding: '2px 6px', fontFamily: 'monospace', fontSize: '9px', color: '#22c55e' }
const tradeHistoryHeader = { display: 'grid', gridTemplateColumns: '80px 60px 60px 70px 70px 1fr', gap: '4px', padding: '6px 8px', fontFamily: 'monospace', fontSize: '8px', color: '#4a5270', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '0.5px solid #1a1f2e', marginBottom: '4px' }
const tradeHistoryRow = { display: 'grid', gridTemplateColumns: '80px 60px 60px 70px 70px 1fr', gap: '4px', padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', borderBottom: '0.5px solid #0d1018', paddingLeft: '10px' }
const tradeSummaryRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px 4px', marginTop: '4px', borderTop: '0.5px solid #1a1f2e' }
