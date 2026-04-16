'use client'
import { fmtUSD, fmtEUR, pnlColor } from '@/lib/format'

const GRID_STYLE = `
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 900px) {
    .summary-grid { grid-template-columns: repeat(4, 1fr); }
  }
`

function Card({ label, value, valueColor, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.065)',
      borderRadius: '14px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 500, color: '#3d4a5c',
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: '20px',
        fontWeight: 600,
        color: valueColor || '#eef2ff',
        letterSpacing: '-0.01em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// openNetEur: total estimated net EUR of open positions (optional)
// openCount:  number of open positions (optional)
// When both are provided and openCount > 0, Net Profit and Total Trades
// reflect the combined value. Win rate is always closed trades only.
export default function SummaryCards({ trades, openNetEur, openCount, adjustedNetEur }) {
  const count    = trades?.length ?? 0
  const hasData  = count > 0

  const grossSum = hasData ? trades.reduce((s, t) => s + t.gross_pnl_usd, 0)       : null
  const feesSum  = hasData ? trades.reduce((s, t) => s + t.total_costs_usd, 0)     : null
  const txSum    = hasData ? trades.reduce((s, t) => s + t.transaction_fees_usd, 0): null
  const platSum  = hasData ? trades.reduce((s, t) => s + t.platform_fees_usd, 0)   : null
  const intSum   = hasData ? trades.reduce((s, t) => s + t.interest_usd, 0)        : null
  const netSum   = hasData ? trades.reduce((s, t) => s + t.net_eur, 0)             : null
  const avgNet   = hasData ? netSum / count                                         : null
  const bestNet  = hasData ? Math.max(...trades.map(t => t.net_eur))               : null
  const worstNet = hasData ? Math.min(...trades.map(t => t.net_eur))               : null
  const wins     = hasData ? trades.filter(t => t.net_eur > 0).length             : 0
  const winRate  = hasData ? Math.round((wins / count) * 100)                      : null

  const showOpen       = openCount > 0 && openNetEur != null
  const baseNetSum     = adjustedNetEur != null ? adjustedNetEur : netSum
  const displayNetSum  = showOpen ? (baseNetSum ?? 0) + openNetEur : baseNetSum
  const displayCount   = showOpen ? count + openCount : count
  const showShared     = adjustedNetEur != null

  return (
    <>
      <style>{GRID_STYLE}</style>
      <div className="summary-grid">
        <Card label="Total Trades"  value={hasData || showOpen ? displayCount : '—'} />
        <Card label="Gross P&L"     value={fmtUSD(grossSum)}  valueColor={pnlColor(grossSum)} />
        <Card
          label="Total Fees"
          value={fmtUSD(feesSum)}
          valueColor="#8892a8"
          sub={hasData ? `Tx: ${fmtUSD(txSum)} | Plat: ${fmtUSD(platSum)} | Int: ${fmtUSD(intSum)}` : null}
        />
        <Card
          label="Net Profit"
          value={fmtEUR(displayNetSum)}
          valueColor={pnlColor(displayNetSum)}
          sub={
            showOpen
              ? 'incl. open est.'
              : showShared
              ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(34,197,94,0.5)', letterSpacing: '0.08em' }}>fees shared</span>
              : null
          }
        />
        <Card label="Avg Per Trade" value={fmtEUR(avgNet)}    valueColor={pnlColor(avgNet)} />
        <Card label="Best Trade"    value={fmtEUR(bestNet)}   valueColor="#34d399" />
        <Card label="Worst Trade"   value={fmtEUR(worstNet)}  valueColor={pnlColor(worstNet)} />
        <Card
          label="Win Rate"
          value={winRate != null ? `${winRate}%` : '—'}
          valueColor={winRate != null ? (winRate >= 50 ? '#34d399' : '#f87171') : '#8892a8'}
          sub={showOpen ? 'closed trades only' : null}
        />
      </div>
    </>
  )
}
