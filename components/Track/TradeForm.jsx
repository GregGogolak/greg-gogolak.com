'use client'
import { useState, useEffect, useCallback } from 'react'
import { calculateTrade } from '@/lib/tradeCalculations'
import { fmtEUR } from '@/lib/format'

const FIELD_STYLE = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#eef2ff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: "'Inter Tight', sans-serif",
  boxSizing: 'border-box',
}

const LABEL_STYLE = {
  fontSize: '10px',
  fontWeight: 500,
  color: '#4a5568',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  display: 'block',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY = {
  buy_date:   today(),
  sell_date:  today(),
  buy_price:  '',
  sell_price: '',
  shares:     '',
  type:       'SCALP',
}

export default function TradeForm({ open, editTrade, onClose, onSaved }) {
  const [form,      setForm]      = useState(EMPTY)
  const [preview,   setPreview]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [confirmed, setConfirmed] = useState(null)   // "Trade added — Net: €X,XXX"

  // Pre-fill when editing an existing trade
  useEffect(() => {
    if (editTrade) {
      setForm({
        buy_date:   editTrade.buy_date,
        sell_date:  editTrade.sell_date,
        buy_price:  String(editTrade.buy_price),
        sell_price: String(editTrade.sell_price),
        shares:     String(editTrade.shares),
        type:       editTrade.type,
      })
    } else {
      setForm(EMPTY)
    }
    setPreview(null)
    setError(null)
    setConfirmed(null)
  }, [editTrade, open])

  // Live preview — recalculate on every input change
  const recalcPreview = useCallback((f) => {
    const bp = parseFloat(f.buy_price)
    const sp = parseFloat(f.sell_price)
    const sh = parseFloat(f.shares)
    if (bp > 0 && sp > 0 && sh > 0 && f.buy_date && f.sell_date && f.sell_date >= f.buy_date) {
      try {
        const result = calculateTrade({ buy_price: bp, sell_price: sp, shares: sh, buy_date: f.buy_date, sell_date: f.sell_date })
        setPreview(result)
      } catch {
        setPreview(null)
      }
    } else {
      setPreview(null)
    }
  }, [])

  function handleChange(field, value) {
    const next = { ...form, [field]: value }
    setForm(next)
    recalcPreview(next)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const body = {
      buy_date:   form.buy_date,
      sell_date:  form.sell_date,
      buy_price:  parseFloat(form.buy_price),
      sell_price: parseFloat(form.sell_price),
      shares:     parseFloat(form.shares),
      type:       'SCALP',
    }

    try {
      let res, data
      if (editTrade) {
        res  = await fetch('/api/trades', { method: 'PUT',    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editTrade.id, ...body }) })
        data = await res.json()
      } else {
        res  = await fetch('/api/trades', { method: 'POST',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        data = await res.json()
      }

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      const net = fmtEUR(data.net_eur)
      setConfirmed(editTrade ? `Trade updated — Net: ${net}` : `Trade added — Net: ${net}`)
      onSaved(data, !!editTrade)

      // Close after brief confirmation display
      setTimeout(() => {
        setConfirmed(null)
        onClose()
      }, 1600)
    } catch {
      setError('Network error — please try again')
    }
    setLoading(false)
  }

  if (!open) return null

  const netColor = preview ? (preview.net_eur >= 0 ? '#34d399' : '#f87171') : '#3d4a5c'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(8,9,16,0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', zIndex: 201,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, calc(100vw - 32px))',
        background: 'linear-gradient(180deg, rgba(14,15,26,0.98) 0%, rgba(8,9,16,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#eef2ff' }}>
              {editTrade ? 'Edit Trade' : 'Add Trade'}
            </div>
            <div style={{ fontSize: '11px', color: '#3d4a5c', marginTop: '2px' }}>NVDA · USD</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4a5568', fontSize: '18px', padding: '4px',
              borderRadius: '6px', lineHeight: 1,
            }}
            onMouseEnter={e => e.target.style.color = '#8892a8'}
            onMouseLeave={e => e.target.style.color = '#4a5568'}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={LABEL_STYLE}>Buy Date</label>
              <input
                type="date"
                value={form.buy_date}
                onChange={e => handleChange('buy_date', e.target.value)}
                required
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Sell Date</label>
              <input
                type="date"
                value={form.sell_date}
                onChange={e => handleChange('sell_date', e.target.value)}
                required
                style={FIELD_STYLE}
              />
            </div>
          </div>

          {/* Prices row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={LABEL_STYLE}>Buy Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.buy_price}
                onChange={e => handleChange('buy_price', e.target.value)}
                required
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Sell Price (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.sell_price}
                onChange={e => handleChange('sell_price', e.target.value)}
                required
                style={FIELD_STYLE}
              />
            </div>
          </div>

          {/* Shares row */}
          <div style={{ marginBottom: '20px' }}>
            <label style={LABEL_STYLE}>Shares</label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="0"
              value={form.shares}
              onChange={e => handleChange('shares', e.target.value)}
              required
              style={FIELD_STYLE}
            />
          </div>

          {/* Live preview */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: preview ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)',
            border: `1px solid ${preview ? netColor + '30' : 'rgba(255,255,255,0.06)'}`,
            marginBottom: '16px',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '10px', color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Net EUR Preview
              </span>
              <span style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: '22px',
                fontWeight: 700,
                color: preview ? netColor : '#3d4a5c',
                letterSpacing: '-0.01em',
              }}>
                {preview ? fmtEUR(preview.net_eur) : '—'}
              </span>
            </div>
            {preview && (
              <div style={{
                display: 'flex', gap: '16px', marginTop: '8px',
                fontSize: '10px', color: '#4a5568',
              }}>
                <span>Gross: ${preview.gross_pnl_usd.toFixed(0)}</span>
                <span>Fees: ${preview.total_costs_usd.toFixed(0)}</span>
                <span>Days: {preview.interest_days}</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12px',
              marginBottom: '14px',
            }}>
              {error}
            </div>
          )}

          {/* Confirmation */}
          {confirmed && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '8px',
              color: '#34d399',
              fontSize: '12px',
              marginBottom: '14px',
              fontWeight: 500,
            }}>
              {confirmed}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !!confirmed}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading || confirmed ? 'default' : 'pointer',
              background: 'rgba(91,156,246,0.15)',
              border: '1px solid rgba(91,156,246,0.3)',
              color: '#7aabf8',
              opacity: loading || confirmed ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Saving…' : editTrade ? 'Update Trade' : 'Add Trade'}
          </button>
        </form>
      </div>
    </>
  )
}
