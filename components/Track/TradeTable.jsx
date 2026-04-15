'use client'
import React, { useState } from 'react'
import StatusBadge from '@/components/UI/StatusBadge'
import { fmtUSD, fmtEUR, pnlColor } from '@/lib/format'

const TH = ({ children, align = 'right' }) => (
  <th style={{
    padding: '8px 14px',
    fontSize: '10px',
    fontWeight: 500,
    color: '#3d4a5c',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    textAlign: align,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid rgba(255,255,255,0.065)',
    background: 'rgba(255,255,255,0.018)',
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
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontFamily: "'Inter Tight', sans-serif",
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
        background: 'rgba(248,113,113,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(248,113,113,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '12px', color: '#f87171' }}>
            Delete this trade? This cannot be undone.
          </span>
          <button
            onClick={onCancel}
            style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#8892a8', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(trade.id)}
            disabled={loading}
            style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px',
              background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
              color: '#f87171', cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function TradeTable({ trades, onEdit, onDelete }) {
  const [confirmId,   setConfirmId]   = useState(null)
  const [deletingId,  setDeletingId]  = useState(null)
  const [hoveredId,   setHoveredId]   = useState(null)

  async function handleDelete(id) {
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
    setConfirmId(null)
  }

  if (!trades || trades.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#3d4a5c',
        fontSize: '13px',
        background: 'rgba(255,255,255,0.018)',
        border: '1px solid rgba(255,255,255,0.065)',
        borderRadius: '14px',
      }}>
        No trades yet. Add your first trade above.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.065)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
        <thead>
          <tr>
            <TH align="left">Dates</TH>
            <TH align="left">Type</TH>
            <TH>Shares</TH>
            <TH>Buy Price</TH>
            <TH>Sell Price</TH>
            <TH>Days</TH>
            <TH>Gross P&L</TH>
            <TH>Tx Fees</TH>
            <TH>Platform</TH>
            <TH>Interest</TH>
            <TH>Total Costs</TH>
            <TH>Net EUR</TH>
            <TH align="center">Actions</TH>
          </tr>
        </thead>
        <tbody>
          {trades.map(t => (
            <React.Fragment key={t.id}>
              <tr
                onMouseEnter={() => setHoveredId(t.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: hoveredId === t.id ? 'rgba(255,255,255,0.025)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Dates */}
                <TD style={{ textAlign: 'left', color: '#8892a8', fontFamily: 'Inter, sans-serif', fontSize: '11px' }}>
                  {t.buy_date}
                  {t.buy_date !== t.sell_date && (
                    <> <span style={{ color: '#3d4a5c' }}>→</span> {t.sell_date}</>
                  )}
                </TD>

                {/* Type */}
                <TD style={{ textAlign: 'left' }}>
                  <StatusBadge status={t.type} />
                </TD>

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
                <TD style={{ color: '#4a5568' }}>
                  {t.platform_fee_days}d × $96
                </TD>

                {/* Interest */}
                <TD style={{ color: '#4a5568' }}>
                  {fmtUSD(t.interest_usd)}
                </TD>

                {/* Total Costs */}
                <TD style={{ color: '#4a5568' }}>
                  {fmtUSD(t.total_costs_usd)}
                </TD>

                {/* Net EUR — hero column */}
                <TD style={{
                  color: pnlColor(t.net_eur),
                  fontWeight: 700,
                  fontSize: '13px',
                }}>
                  {fmtEUR(t.net_eur)}
                </TD>

                {/* Actions */}
                <TD style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit trade"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#4a5568', fontSize: '14px', padding: '2px 4px',
                        borderRadius: '4px', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.color = '#8892a8'}
                      onMouseLeave={e => e.target.style.color = '#4a5568'}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setConfirmId(confirmId === t.id ? null : t.id)}
                      title="Delete trade"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: confirmId === t.id ? '#f87171' : '#4a5568',
                        fontSize: '14px', padding: '2px 4px',
                        borderRadius: '4px', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.target.style.color = '#f87171'}
                      onMouseLeave={e => e.target.style.color = confirmId === t.id ? '#f87171' : '#4a5568'}
                    >
                      ✕
                    </button>
                  </div>
                </TD>
              </tr>

              {confirmId === t.id && (
                <DeleteConfirmRow
                  colSpan={13}
                  trade={t}
                  onConfirm={handleDelete}
                  onCancel={() => setConfirmId(null)}
                  loading={deletingId === t.id}
                />
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
