'use client'
import { useState, useEffect, useCallback } from 'react'
import { calculateTrade } from '@/lib/tradeCalculations'
import { fmtEUR } from '@/lib/format'

const FIELD_STYLE = {
  width: '100%',
  minWidth: 0,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '9px 12px',
  color: '#eef2ff',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'JetBrains Mono, monospace',
  boxSizing: 'border-box',
}

const LABEL_STYLE = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '10px',
  fontWeight: 400,
  color: 'rgba(255,255,255,0.3)',
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

  const netColor = preview ? (preview.net_eur >= 0 ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.2)'

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
        position: 'fixed',
        zIndex: 201,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, calc(100vw - 32px))',
        maxHeight: 'calc(100dvh - 48px)',
        overflowY: 'auto',
        background: 'linear-gradient(180deg, rgba(14,15,26,0.98) 0%, rgba(8,9,16,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: '#eef2ff',
            }}>
              {editTrade ? 'Edit Trade' : 'Add Trade'}
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.25)',
              marginTop: '2px',
            }}>NVDA · USD</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: '18px', padding: '4px',
              borderRadius: '9999px', lineHeight: 1,
              transition: 'color 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Dates row */}
          <div className="trade-form-dates" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', overflow: 'hidden' }}>
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
            background: 'rgba(0,0,0,0.2)',
            border: `0.5px solid ${preview ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
            marginBottom: '16px',
            transition: 'border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Net EUR Preview
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '22px',
                fontWeight: 600,
                color: preview ? netColor : 'rgba(255,255,255,0.15)',
                letterSpacing: '-0.01em',
              }}>
                {preview ? fmtEUR(preview.net_eur) : '—'}
              </span>
            </div>
            {preview && (
              <div style={{
                display: 'flex', gap: '16px', marginTop: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.3)',
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
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              color: '#ef4444',
              fontFamily: 'JetBrains Mono, monospace',
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
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: '10px',
              color: '#22c55e',
              fontFamily: 'JetBrains Mono, monospace',
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
              borderRadius: '9999px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading || confirmed ? 'default' : 'pointer',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              color: 'rgba(59,130,246,0.9)',
              opacity: loading || confirmed ? 0.6 : 1,
              transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={e => {
              if (!loading && !confirmed) {
                e.currentTarget.style.background = 'rgba(59,130,246,0.22)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(59,130,246,0.15)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {loading ? 'Saving…' : editTrade ? 'Update Trade' : 'Add Trade'}
          </button>
        </form>
      </div>
    </>
  )
}
