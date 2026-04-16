'use client'
import { useState } from 'react'
import { calcNetPnl, fmtPrice } from '@/lib/calculations'

const card = {
  background: 'rgba(255,255,255,0.028)',
  border: '1px solid rgba(255,255,255,0.065)',
  borderRadius: '14px', padding: '16px 18px',
}

export default function PositionPanel({ positions = [], currentPrice, onAdd, onRemove, style: styleProp }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ type: 'CONVICTION', shares: '', entryPrice: '', entryDate: new Date().toISOString().split('T')[0], label: '' })
  function handleAdd(e) {
    e.preventDefault()
    onAdd?.({ ...form, shares: Number(form.shares), entryPrice: Number(form.entryPrice) })
    setForm({ type: 'CONVICTION', shares: '', entryPrice: '', entryDate: new Date().toISOString().split('T')[0], label: '' })
    setShowForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...styleProp }}>
      {/* Positions */}
      <div style={{ ...card, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '12px' }}>
          <button onClick={() => setShowForm(v => !v)} style={{
            background: 'rgba(91,156,246,0.12)', border: '1px solid rgba(91,156,246,0.25)',
            color: '#5b9cf6', borderRadius: '7px', padding: '3px 10px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>

        {positions.length === 0 && !showForm && (
          <div style={{ fontSize: '13px', color: '#3d4a5c', textAlign: 'center', padding: '10px 0' }}>No open positions</div>
        )}

        {positions.map(pos => {
          const pnl = currentPrice ? calcNetPnl({ entryPrice: pos.entryPrice, currentPrice, shares: pos.shares, entryDate: pos.entryDate }) : null
          const isUp = pnl && pnl.gross >= 0
          return (
            <div key={pos.id} style={{ borderTop: '1px solid rgba(255,255,255,0.065)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '4px',
                    color: pos.type === 'CONVICTION' ? '#5b9cf6' : '#fb923c',
                    background: pos.type === 'CONVICTION' ? 'rgba(91,156,246,0.1)' : 'rgba(251,146,60,0.1)',
                    marginRight: '6px',
                  }}>{pos.type}</span>
                  <span style={{ fontSize: '12px', color: '#8892a8' }}>{pos.shares.toLocaleString()} shares @ {fmtPrice(pos.entryPrice)}</span>
                </div>
                <button onClick={() => onRemove?.(pos.id)} style={{
                  background: 'none', border: 'none', color: '#3d4a5c',
                  fontSize: '14px', cursor: 'pointer', padding: '0 2px',
                }}>×</button>
              </div>
              {pnl && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3d4a5c', marginBottom: '2px' }}>Gross P&L</div>
                    <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', fontWeight: 500, color: isUp ? '#34d399' : '#f87171' }}>
                      {isUp ? '+' : ''}{fmtPrice(pnl.gross)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3d4a5c', marginBottom: '2px' }}>Net EUR</div>
                    <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', fontWeight: 500, color: isUp ? '#34d399' : '#f87171' }}>
                      €{Math.round(pnl.netEur).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#3d4a5c', marginBottom: '2px' }}>Days</div>
                    <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: '14px', color: '#8892a8' }}>{pnl.daysHeld}d</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.065)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['CONVICTION', 'SCALP'].map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  flex: 1, padding: '5px 0', borderRadius: '7px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  fontSize: '11px', fontWeight: 600,
                  border: form.type === t ? `1px solid ${t === 'CONVICTION' ? 'rgba(91,156,246,0.4)' : 'rgba(251,146,60,0.4)'}` : '1px solid rgba(255,255,255,0.065)',
                  background: form.type === t ? (t === 'CONVICTION' ? 'rgba(91,156,246,0.12)' : 'rgba(251,146,60,0.1)') : 'transparent',
                  color: form.type === t ? (t === 'CONVICTION' ? '#5b9cf6' : '#fb923c') : '#3d4a5c',
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Shares" type="number" value={form.shares} onChange={e => setForm(f => ({ ...f, shares: e.target.value }))} required style={inputStyle} />
              <input placeholder="Entry $" type="number" step="0.01" value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} required style={inputStyle} />
            </div>
            <input type="date" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))} style={inputStyle} />
            <button type="submit" style={{
              background: 'rgba(91,156,246,0.15)', border: '1px solid rgba(91,156,246,0.3)',
              color: '#5b9cf6', borderRadius: '8px', padding: '8px',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>Add Position</button>
          </form>
        )}
      </div>

    </div>
  )
}

const inputStyle = {
  flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '7px', padding: '6px 10px', color: '#eef2ff', fontSize: '12px',
  fontFamily: 'Inter, sans-serif', outline: 'none',
}
