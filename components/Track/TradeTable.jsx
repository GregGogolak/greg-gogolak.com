'use client'
import React, { useState } from 'react'
import { fmtUSD, fmtEUR, pnlColor } from '@/lib/format'
import { calculateSharedPlatformFee, recalculateNetWithSharedFees } from '@/lib/tradeCalculations'

const TH = ({ children, align = 'right' }) => (
  <th style={{
    fontFamily: 'JetBrains Mono, monospace',
    padding: '8px 14px',
    fontSize: '10px',
    fontWeight: 400,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textAlign: align,
    whiteSpace: 'nowrap',
    borderBottom: '0.5px solid rgba(255,255,255,0.065)',
    background: 'rgba(255,255,255,0.03)',
  }}>
    {children}
  </th>
)

const TD = ({ children, style }) => (
  <td style={{
    padding: '10px 14px',
    fontSize: '12px',
    color: '#eef2ff',
    whiteSpace: 'nowrap',
    borderBottom: '0.5px solid rgba(255,255,255,0.04)',
    fontFamily: 'JetBrains Mono, monospace',
    textAlign: 'right',
    ...style,
  }}>
    {children}
  </td>
)

function DeleteConfirmRow({ colSpan, trade, onConfirm, onCancel, loading }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{
        padding: '10px 14px',
        background: 'rgba(239,68,68,0.06)',
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        borderTop: '0.5px solid rgba(239,68,68,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: '#ef4444',
          }}>
            Delete this trade? This cannot be undone.
          </span>
          <button
            onClick={onCancel}
            style={{
              padding: '4px 12px', borderRadius: '9999px', fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(trade.id)}
            disabled={loading}
            style={{
              padding: '4px 12px', borderRadius: '9999px', fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)',
              color: '#ef4444', cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

const SortableHeader = ({ col, label, sortCol, sortDir, onSort }) => (
  <th
    onClick={() => onSort(col)}
    style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: sortCol === col ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      padding: '8px 12px',
      textAlign: 'left',
      fontWeight: '400',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'color 200ms cubic-bezier(0.16,1,0.3,1)',
      borderBottom: '0.5px solid rgba(255,255,255,0.065)',
      background: 'rgba(255,255,255,0.03)',
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
    onMouseLeave={e => e.currentTarget.style.color = sortCol === col ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)'}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {label}
      <span style={{
        fontSize: '8px',
        color: sortCol === col ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
        transition: 'color 200ms cubic-bezier(0.16,1,0.3,1)',
      }}>
        {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </span>
  </th>
)

export default function TradeTable({ trades, platformFeeMap, onEdit, onDelete, selectMode = false, selectedIds = new Set(), onToggleSelect, onToggleAll }) {
  const [confirmId,   setConfirmId]   = useState(null)
  const [deletingId,  setDeletingId]  = useState(null)
  const [hoveredId,   setHoveredId]   = useState(null)
  const [sortCol,     setSortCol]     = useState('buy_date')
  const [sortDir,     setSortDir]     = useState('desc')

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  async function handleDelete(id) {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
    setConfirmId(null)
  }

  const sortedTrades = [...(trades ?? [])].sort((a, b) => {
    let aVal, bVal
    switch (sortCol) {
      case 'buy_date':   aVal = a.buy_date;      bVal = b.buy_date;      break
      case 'shares':     aVal = a.shares;         bVal = b.shares;        break
      case 'buy_price':  aVal = a.buy_price;      bVal = b.buy_price;     break
      case 'sell_price': aVal = a.sell_price;     bVal = b.sell_price;    break
      case 'sell_date':  aVal = a.sell_date;      bVal = b.sell_date;     break
      case 'gross_pnl':  aVal = a.gross_pnl_usd;  bVal = b.gross_pnl_usd; break
      case 'net_eur':    aVal = a.net_eur;         bVal = b.net_eur;       break
      default:           aVal = a.buy_date;       bVal = b.buy_date
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  if (!trades || trades.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'JetBrains Mono, monospace',
        color: 'rgba(255,255,255,0.25)',
        fontSize: '13px',
        background: '#13131e',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        No trades yet. Add your first trade above.
      </div>
    )
  }

  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: '18px',
      border: '0.5px solid rgba(255,255,255,0.07)',
      background: '#13131e',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
        <thead>
          <tr>
            {selectMode && (
              <th style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.065)' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedTrades.length && sortedTrades.length > 0}
                  onChange={() => onToggleAll(sortedTrades.map(t => t.id))}
                  style={{
                    appearance: 'none', width: 14, height: 14, borderRadius: 3,
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    background: selectedIds.size === sortedTrades.length && sortedTrades.length > 0 ? 'rgba(59,130,246,0.4)' : 'transparent',
                    cursor: 'pointer', display: 'block',
                  }}
                />
              </th>
            )}
            <TH align="left">Ticker</TH>
            <SortableHeader col="buy_date"   label="Buy Date"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="sell_date"  label="Sell Date"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="shares"     label="Shares"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="buy_price"  label="Buy Price"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <SortableHeader col="sell_price" label="Sell Price" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <TH>Days</TH>
            <SortableHeader col="gross_pnl"  label="Gross P&L"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <TH>Tx Fees</TH>
            <TH>Platform</TH>
            <TH align="left">Shared With</TH>
            <TH>Interest</TH>
            <TH>Total Costs</TH>
            <SortableHeader col="net_eur"    label="Net EUR"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
            <TH align="center">Actions</TH>
          </tr>
        </thead>
        <tbody>
          {sortedTrades.map(t => {
            const sharedFees = calculateSharedPlatformFee(t, platformFeeMap)
            const { adjustedNetEur, adjustedPlatformFee } = recalculateNetWithSharedFees(t, sharedFees)
            const displayNetEur = platformFeeMap ? adjustedNetEur : t.net_eur
            const displayTotalCosts = platformFeeMap
              ? (t.transaction_fees_usd ?? 0) + sharedFees.totalPlatformFee + (t.interest_usd ?? 0)
              : (t.total_costs_usd ?? 0)
            const feeIsShared = platformFeeMap && (sharedFees.buyUsers > 1 || sharedFees.sellUsers > 1)

            return (
            <React.Fragment key={t.id}>
              <tr
                onMouseEnter={e => {
                  setHoveredId(t.id)
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  setHoveredId(null)
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
                style={{
                  background: hoveredId === t.id ? 'rgba(255,255,255,0.025)' : 'transparent',
                  transition: 'background 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {selectMode && (
                  <td style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => onToggleSelect(t.id)}
                      style={{
                        appearance: 'none', width: 14, height: 14, borderRadius: 3,
                        border: '0.5px solid rgba(255,255,255,0.2)',
                        background: selectedIds.has(t.id) ? 'rgba(59,130,246,0.4)' : 'transparent',
                        cursor: 'pointer', display: 'block',
                      }}
                    />
                  </td>
                )}
                {/* Ticker */}
                <td style={{
                  padding: '10px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: t.ticker === 'NVDA' || !t.ticker ? 'rgba(59,130,246,0.7)' : 'rgba(255,255,255,0.5)',
                  whiteSpace: 'nowrap',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                }}>
                  {t.ticker ?? 'NVDA'}
                </td>

                {/* Buy Date */}
                <td style={{
                  padding: '10px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  whiteSpace: 'nowrap',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                }}>
                  {t.buy_date}
                </td>

                {/* Sell Date */}
                <td style={{
                  padding: '10px 12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: t.sell_date === t.buy_date
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.5)',
                  whiteSpace: 'nowrap',
                  borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                }}>
                  {t.sell_date === t.buy_date ? 'same day' : t.sell_date}
                </td>

                {/* Shares */}
                <TD>{t.shares.toLocaleString()}</TD>

                {/* Buy Price */}
                <TD>${t.buy_price.toFixed(2)}</TD>

                {/* Sell Price */}
                <TD>${t.sell_price.toFixed(2)}</TD>

                {/* Days Held */}
                <TD>{t.calendar_days}</TD>

                {/* Gross P&L */}
                <TD style={{ color: pnlColor(t.gross_pnl_usd) }}>
                  {fmtUSD(t.gross_pnl_usd)}
                </TD>

                {/* Tx Fees */}
                <TD style={{ color: '#4a5568' }}>
                  {fmtUSD(t.transaction_fees_usd)}
                </TD>

                {/* Platform Fees */}
                <TD style={{ color: feeIsShared ? 'rgba(255,255,255,0.6)' : '#4a5568' }}>
                  {platformFeeMap ? (
                    <div>
                      <div>${adjustedPlatformFee.toFixed(0)}</div>
                      {feeIsShared && (
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                          was ${t.platform_fees_usd?.toFixed(0) ?? (t.buy_date !== t.sell_date ? '192' : '96')}
                        </div>
                      )}
                    </div>
                  ) : (
                    `${t.platform_fee_days}d × $96`
                  )}
                </TD>

                {/* Shared With */}
                <TD style={{ textAlign: 'left', padding: '10px 12px', maxWidth: '160px' }}>
                  {platformFeeMap ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {sharedFees.buyDaySharedWith.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>BUY</span>
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {sharedFees.buyDaySharedWith.map((name, i) => (
                              <span key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(59,130,246,0.08)', border: '0.5px solid rgba(59,130,246,0.2)', color: 'rgba(59,130,246,0.7)', whiteSpace: 'nowrap' }}>{name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sharedFees.sellDaySharedWith.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>SELL</span>
                          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                            {sharedFees.sellDaySharedWith.map((name, i) => (
                              <span key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(59,130,246,0.08)', border: '0.5px solid rgba(59,130,246,0.2)', color: 'rgba(59,130,246,0.7)', whiteSpace: 'nowrap' }}>{name}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {sharedFees.buyDaySharedWith.length === 0 && sharedFees.sellDaySharedWith.length === 0 && (
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>—</span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>Loading...</span>
                  )}
                </TD>

                {/* Interest */}
                <TD style={{ color: '#4a5568' }}>
                  {fmtUSD(t.interest_usd)}
                </TD>

                {/* Total Costs */}
                <TD style={{ color: '#4a5568' }}>
                  {fmtUSD(displayTotalCosts)}
                </TD>

                {/* Net EUR — hero column */}
                <TD style={{
                  color: pnlColor(displayNetEur),
                  fontWeight: 600,
                  fontSize: '13px',
                }}>
                  {fmtEUR(displayNetEur)}
                </TD>

                {/* Actions */}
                <TD style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit trade"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#4a5568', fontSize: '14px', padding: '2px 6px',
                        borderRadius: '9999px',
                        transition: 'color 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#4a5568'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setConfirmId(confirmId === t.id ? null : t.id)}
                      title="Delete trade"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: confirmId === t.id ? '#ef4444' : '#4a5568',
                        fontSize: '14px', padding: '2px 6px',
                        borderRadius: '9999px',
                        transition: 'color 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = confirmId === t.id ? '#ef4444' : '#4a5568'; e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      ✕
                    </button>
                  </div>
                </TD>
              </tr>

              {confirmId === t.id && (
                <DeleteConfirmRow
                  colSpan={selectMode ? 16 : 15}
                  trade={t}
                  onConfirm={handleDelete}
                  onCancel={() => setConfirmId(null)}
                  loading={deletingId === t.id}
                />
              )}
            </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
