'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNVDAData }       from '@/hooks/useNVDAData'
import { useMacroData }      from '@/hooks/useMacroData'
import { useNews }           from '@/hooks/useNews'
import {
  calcProjectedPnl,
  calcInterestErosionDay,
  fmtEur,
  daysUntil,
} from '@/lib/calculations'
import { getBuyChecklist } from '@/lib/thesisEngine'
import { EARNINGS_DATE } from '@/lib/config'

/* ─── Design tokens ───────────────────────────────────────────────────── */
const GREEN  = '#34d399'
const AMBER  = '#fbbf24'
const RED    = '#f87171'
const BORDER = 'rgba(255,255,255,0.065)'
const CARD   = 'rgba(255,255,255,0.028)'
const TEXT   = '#eef2ff'
const MUTED  = '#8892a8'
const DIM    = '#3d4a5c'

const cardStyle = {
  background:   CARD,
  border:       `1px solid ${BORDER}`,
  borderRadius: '14px',
  padding:      '20px',
}

const CONF_STYLE = {
  HIGH:   { color: GREEN, bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  MEDIUM: { color: AMBER, bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  LOW:    { color: RED,   bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
}

/* ─── P&L computation ─────────────────────────────────────────────────── */
function computePnl(ep, tp, sh, type) {
  if (!(ep > 0 && tp > 0 && sh > 0)) return null
  const dayList = type === 'SCALP' ? [1, 2] : [1, 7, 14, 30]
  const rows    = dayList.map(d =>
    calcProjectedPnl({ entryPrice: ep, exitPrice: tp, shares: sh, daysHeld: d })
  )
  // Break-even at day 1: solve (be - ep)*sh - ep*sh*0.001 - be*sh*0.001 - ep*sh*0.000212 = 0
  // → be = ep * (1 + 0.001 + 0.000212) / (1 - 0.001)
  const breakEven  = ep * 1.001212 / 0.999
  const erosionDay = type === 'CONVICTION' ? calcInterestErosionDay(ep, tp, sh) : null
  return { rows, dayList, breakEven, erosionDay }
}

/* ─── Shimmer skeleton ───────────────────────────────────────────────── */
function Shimmer({ h = 14, w = '100%', style = {} }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 6,
      background: 'linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

/* ─── Input field ────────────────────────────────────────────────────── */
function InputField({ label, value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: DIM, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
        {label}
      </div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, color: TEXT,
          fontFamily: "'Inter Tight', monospace",
          fontSize: 16, padding: '10px 14px',
          outline: 'none', transition: 'border-color 0.15s',
        }}
      />
      {hint && (
        <div style={{ fontSize: 11, color: DIM, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
          {hint}
        </div>
      )}
    </div>
  )
}

/* ─── Checklist row ──────────────────────────────────────────────────── */
function CheckRow({ item }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 0', borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        background:  item.pass ? 'rgba(52,211,153,0.2)' : 'transparent',
        border:      item.pass ? `1.5px solid ${GREEN}` : `1.5px solid ${RED}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.pass && <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />}
      </div>
      <div style={{ flex: 1, fontSize: 12, color: item.pass ? MUTED : '#c87070', fontFamily: 'Inter, sans-serif', lineHeight: 1.3 }}>
        {item.label}
      </div>
      <div style={{ fontSize: 11, fontFamily: "'Inter Tight', monospace", color: item.pass ? GREEN : RED, fontWeight: 600 }}>
        {item.value}
      </div>
    </div>
  )
}

/* ─── Section label ──────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: DIM,
      marginBottom: 16, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

/* ─── Spinner ────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      border: '2px solid rgba(52,211,153,0.25)',
      borderTopColor: GREEN,
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                             */
/* ══════════════════════════════════════════════════════════════════════ */
export default function TradePage() {
  const router = useRouter()
  const { data: nvda }  = useNVDAData()
  const { data: macro } = useMacroData()
  const { articles }    = useNews()

  const [entry,          setEntry]          = useState('')
  const [target,         setTarget]         = useState('')
  const [shares,         setShares]         = useState('')
  const [tradeType,      setTradeType]      = useState('CONVICTION')
  const [aiResult,       setAiResult]       = useState(null)
  const [aiLoading,      setAiLoading]      = useState(false)
  const [logStatus,      setLogStatus]      = useState(null)   // null | 'loading' | 'success' | 'error'
  const [analystTarget,  setAnalystTarget]  = useState(264)
  const [pricePreFilled, setPricePreFilled] = useState(false)

  /* Pre-fill entry with live price on first load */
  useEffect(() => {
    if (nvda?.price && !pricePreFilled) {
      setEntry(nvda.price.toFixed(2))
      setPricePreFilled(true)
    }
  }, [nvda?.price, pricePreFilled])

  /* Fetch analyst target once */
  useEffect(() => {
    fetch('/api/fundamentals')
      .then(r => r.json())
      .then(d => { if (d.analystTarget) setAnalystTarget(d.analystTarget) })
      .catch(() => {})
  }, [])

  /* Parsed inputs */
  const ep    = parseFloat(entry)  || 0
  const tp    = parseFloat(target) || 0
  const sh    = parseInt(shares)   || 0
  const valid = ep > 0 && tp > 0 && sh > 0 && sh <= 5000

  const gainPct = ep > 0 && tp > 0 ? ((tp - ep) / ep * 100) : null
  const pnl     = computePnl(ep, tp, sh, tradeType)

  /* Live checklist */
  const nowSec     = Date.now() / 1000
  const hasBucketC = articles.some(a => a.bucket === 'C' && (nowSec - a.datetime) < 86400)
  const checklist  = (nvda?.price && macro) ? getBuyChecklist({
    price:          nvda.price,
    sma200:         nvda.sma200,
    analystTarget,
    hasBucketCNews: hasBucketC,
    qqqPctChange:   macro.qqq?.pctChange  ?? 0,
    vix:            macro.vix?.level      ?? 0,
    daysToEarnings: daysUntil(EARNINGS_DATE),
  }) : null

  const passCount = checklist?.filter(c => c.pass).length ?? 0
  const passColor = checklist
    ? (passCount >= 5 ? GREEN : passCount >= 3 ? AMBER : RED)
    : DIM

  /* AI evaluate */
  async function handleEvaluate() {
    if (!valid) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res  = await fetch('/api/checklist', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ entryPrice: ep, targetPrice: tp, shares: sh, type: tradeType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Evaluation failed')
      setAiResult(data)
    } catch (e) {
      setAiResult({ error: e.message })
    } finally {
      setAiLoading(false)
    }
  }

  /* Log trade */
  async function handleLogTrade() {
    if (!valid) return
    setLogStatus('loading')
    try {
      const res = await fetch('/api/positions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:  'add',
          payload: {
            type:       tradeType,
            shares:     sh,
            entryPrice: ep,
            entryDate:  new Date().toISOString().split('T')[0],
            label:      '',
          },
        }),
      })
      if (!res.ok) throw new Error('Position log failed')
      setLogStatus('success')
      setTimeout(() => router.push('/'), 2200)
    } catch {
      setLogStatus('error')
    }
  }

  const canLog = valid && aiResult && !aiResult.error && logStatus !== 'loading' && logStatus !== 'success'

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100dvh', background: '#080910', paddingBottom: 80, marginTop: '-68px', paddingTop: '68px' }}>
      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Page header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,9,16,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: 'linear-gradient(135deg,rgba(52,211,153,0.2) 0%,rgba(52,211,153,0.06) 100%)',
          border: '1px solid rgba(52,211,153,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: GREEN,
        }}>◇</div>
        <div>
          <div style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 15, fontWeight: 500, color: TEXT }}>
            Pre-Trade Checklist
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: DIM }}>
            NVDA only · up to 5,000 shares
          </div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className="px-4 pt-4 mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════ */}
          <div className="flex flex-col gap-3">

            {/* ─ Inputs ─ */}
            <div style={cardStyle}>
              <SectionLabel>Trade Setup</SectionLabel>

              {/* CONVICTION / SCALP toggle */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['CONVICTION', 'SCALP'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTradeType(t); setAiResult(null) }}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 8, cursor: 'pointer',
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
                      transition: 'all 0.15s',
                      border: tradeType === t
                        ? `1px solid ${t === 'CONVICTION' ? 'rgba(52,211,153,0.5)' : 'rgba(251,191,36,0.5)'}`
                        : `1px solid ${BORDER}`,
                      background: tradeType === t
                        ? (t === 'CONVICTION' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)')
                        : 'transparent',
                      color: tradeType === t
                        ? (t === 'CONVICTION' ? GREEN : AMBER)
                        : DIM,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tradeType === 'SCALP' && (
                <div style={{
                  fontSize: 11, color: AMBER,
                  background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 8, padding: '8px 12px', marginBottom: 16,
                  fontFamily: 'Inter, sans-serif',
                }}>
                  Max 48hr hold — exit regardless if target not hit
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <InputField
                  label="ENTRY PRICE"
                  value={entry}
                  onChange={v => { setEntry(v); setAiResult(null) }}
                  placeholder="0.00"
                  hint={nvda?.price ? `Live: $${nvda.price.toFixed(2)}` : undefined}
                />
                <InputField
                  label="TARGET PRICE"
                  value={target}
                  onChange={v => { setTarget(v); setAiResult(null) }}
                  placeholder="0.00"
                  hint={gainPct != null ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}% from entry` : undefined}
                />
                <InputField
                  label="SHARES"
                  value={shares}
                  onChange={v => { setShares(v); setAiResult(null) }}
                  placeholder="0"
                  hint="max 5,000"
                />
              </div>

              {/* EVALUATE button */}
              <button
                onClick={handleEvaluate}
                disabled={!valid || aiLoading}
                style={{
                  marginTop: 20, width: '100%', padding: '12px 0',
                  borderRadius: 10,
                  cursor: valid && !aiLoading ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
                  transition: 'all 0.15s',
                  background: valid && !aiLoading ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${valid && !aiLoading ? 'rgba(52,211,153,0.4)' : BORDER}`,
                  color: valid && !aiLoading ? GREEN : DIM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {aiLoading ? <><Spinner /> EVALUATING…</> : 'EVALUATE TRADE'}
              </button>
            </div>

            {/* ─ AI Evaluation ─ */}
            <div style={cardStyle}>
              <SectionLabel>Jarvis Evaluation</SectionLabel>

              {!aiResult && !aiLoading && (
                <div style={{ fontSize: 12, color: DIM, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '16px 0' }}>
                  Fill trade details and tap Evaluate
                </div>
              )}

              {aiLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Shimmer h={10} w="38%" />
                  <Shimmer h={36} />
                  <Shimmer h={10} w="38%" />
                  <Shimmer h={36} />
                  <Shimmer h={26} w="32%" />
                </div>
              )}

              {aiResult && !aiResult.error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: DIM, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                      THESIS
                    </div>
                    <div style={{ fontSize: 13, color: TEXT, fontFamily: 'Inter, sans-serif', lineHeight: 1.55 }}>
                      {aiResult.thesis}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: DIM, marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                      IF WRONG
                    </div>
                    <div style={{ fontSize: 13, color: '#c87070', fontFamily: 'Inter, sans-serif', lineHeight: 1.55 }}>
                      {aiResult.wrongCondition}
                    </div>
                  </div>
                  {aiResult.confidence && CONF_STYLE[aiResult.confidence] && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 20, alignSelf: 'flex-start',
                      background: CONF_STYLE[aiResult.confidence].bg,
                      border: `1px solid ${CONF_STYLE[aiResult.confidence].border}`,
                      color: CONF_STYLE[aiResult.confidence].color,
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      {aiResult.confidence} CONFIDENCE
                    </div>
                  )}
                </div>
              )}

              {aiResult?.error && (
                <div style={{ fontSize: 12, color: RED, fontFamily: 'Inter, sans-serif' }}>
                  {aiResult.error}
                </div>
              )}
            </div>

          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════════════════════════ */}
          <div className="flex flex-col gap-3">

            {/* ─ P&L Projections ─ */}
            <div style={cardStyle}>
              <SectionLabel>P&L Projections</SectionLabel>

              {/* Headline net EUR */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: DIM, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
                  NET EUR AT TARGET (DAY 1)
                </div>
                <div style={{
                  fontFamily: "'Inter Tight', monospace",
                  fontSize: 38, fontWeight: 300, letterSpacing: '-0.01em',
                  color: pnl
                    ? (pnl.rows[0].netEur >= 0 ? GREEN : RED)
                    : DIM,
                }}>
                  {pnl ? fmtEur(pnl.rows[0].netEur) : '—'}
                </div>
              </div>

              {/* Summary grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  {
                    label: 'GROSS P&L',
                    value: pnl
                      ? `${pnl.rows[0].gross >= 0 ? '+' : ''}$${Math.round(Math.abs(pnl.rows[0].gross)).toLocaleString()}`
                      : '—',
                    color: pnl ? (pnl.rows[0].gross >= 0 ? GREEN : RED) : DIM,
                  },
                  {
                    label: 'TOTAL FEES',
                    value: pnl ? `-$${Math.round(pnl.rows[0].fees).toLocaleString()}` : '—',
                    color: pnl ? AMBER : DIM,
                  },
                  {
                    label: 'BREAK-EVEN',
                    value: pnl ? `$${pnl.breakEven.toFixed(2)}` : '—',
                    color: pnl ? MUTED : DIM,
                  },
                  {
                    label: 'NOTIONAL',
                    value: (ep > 0 && sh > 0) ? `$${Math.round(ep * sh).toLocaleString()}` : '—',
                    color: MUTED,
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: DIM, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
                      {label}
                    </div>
                    <div style={{ fontFamily: "'Inter Tight', monospace", fontSize: 13, color }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* P&L decay table */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: DIM, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
                  P&L DECAY — INTEREST EROSION
                </div>
                {pnl ? (
                  <>
                    {pnl.rows.map((row, i) => {
                      const label = tradeType === 'SCALP'
                        ? (row.daysHeld === 1 ? '24 hrs' : '48 hrs')
                        : `Day ${row.daysHeld}`
                      const isLast = i === pnl.rows.length - 1
                      return (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0',
                          borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
                        }}>
                          <div style={{ fontFamily: "'Inter Tight', monospace", fontSize: 12, color: DIM }}>
                            {label}
                          </div>
                          <div style={{
                            fontFamily: "'Inter Tight', monospace", fontSize: 12,
                            color: row.netEur >= 0 ? GREEN : RED,
                          }}>
                            {fmtEur(row.netEur)}
                          </div>
                        </div>
                      )
                    })}

                    {/* Interest erosion warning */}
                    {pnl.erosionDay !== null && pnl.erosionDay > 0 && pnl.erosionDay < 120 && (
                      <div style={{
                        marginTop: 12, padding: '9px 12px', borderRadius: 8,
                        background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: 13, color: AMBER }}>⚠</span>
                        <span style={{ fontSize: 11, color: AMBER, fontFamily: 'Inter, sans-serif' }}>
                          Interest = 20% of profit by{' '}
                          <span style={{ fontFamily: "'Inter Tight', monospace", fontWeight: 600 }}>
                            Day {pnl.erosionDay}
                          </span>
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: DIM, fontFamily: 'Inter, sans-serif' }}>
                    Enter trade details to see projections
                  </div>
                )}
              </div>
            </div>

            {/* ─ Live Conditions ─ */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: DIM, fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>
                  Live Conditions
                </div>
                {checklist && (
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 20,
                    color: passColor,
                    background: passCount >= 5 ? 'rgba(52,211,153,0.1)' : passCount >= 3 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                    border: `1px solid ${passColor}40`,
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    {passCount} / 6 PASS
                  </div>
                )}
              </div>

              {checklist ? (
                <div>
                  {checklist.map((item, i) => <CheckRow key={i} item={item} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[0, 1, 2, 3, 4, 5].map(i => <Shimmer key={i} h={28} />)}
                </div>
              )}
            </div>

            {/* ─ Confirm & Log ─ */}
            <div style={cardStyle}>
              <SectionLabel>Confirm & Log</SectionLabel>

              {/* Trade summary preview */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: '14px 16px', marginBottom: 16,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 12, color: DIM, fontFamily: 'Inter, sans-serif' }}>
                    {sh > 0 ? sh.toLocaleString() : '—'} shares
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                    fontFamily: 'Inter, sans-serif',
                    color:       tradeType === 'CONVICTION' ? GREEN : AMBER,
                    background:  tradeType === 'CONVICTION' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)',
                  }}>
                    {tradeType}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'Inter Tight', monospace", fontSize: 20,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ color: ep > 0 ? MUTED : DIM }}>
                    {ep > 0 ? `$${ep.toFixed(2)}` : '—'}
                  </span>
                  <span style={{ color: DIM, fontSize: 15 }}>→</span>
                  <span style={{ color: tp > 0 ? (tp >= ep ? GREEN : RED) : DIM }}>
                    {tp > 0 ? `$${tp.toFixed(2)}` : '—'}
                  </span>
                </div>
                {pnl && (
                  <div style={{ marginTop: 8, fontSize: 12, color: MUTED, fontFamily: 'Inter, sans-serif' }}>
                    Net EUR at target:{' '}
                    <span style={{
                      fontFamily: "'Inter Tight', monospace", fontWeight: 600,
                      color: pnl.rows[0].netEur >= 0 ? GREEN : RED,
                    }}>
                      {fmtEur(pnl.rows[0].netEur)}
                    </span>
                  </div>
                )}
              </div>

              {/* LOG TRADE button */}
              <button
                onClick={canLog ? handleLogTrade : undefined}
                disabled={!canLog}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 10,
                  cursor: canLog ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14, fontWeight: 600, letterSpacing: '0.06em',
                  transition: 'all 0.2s',
                  background: logStatus === 'success'
                    ? 'rgba(52,211,153,0.15)'
                    : canLog
                      ? 'rgba(52,211,153,0.18)'
                      : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    logStatus === 'success' ? GREEN
                    : canLog ? 'rgba(52,211,153,0.5)'
                    : BORDER
                  }`,
                  color: logStatus === 'success' ? GREEN
                    : canLog ? GREEN
                    : DIM,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {logStatus === 'loading'
                  ? <><Spinner /> LOGGING…</>
                  : logStatus === 'success'
                    ? 'TRADE LOGGED ✓'
                    : 'LOG TRADE'}
              </button>

              {/* Status messages */}
              {logStatus === 'success' && (
                <div style={{ fontSize: 11, color: GREEN, textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
                  Redirecting to dashboard…
                </div>
              )}
              {logStatus === 'error' && (
                <div style={{ fontSize: 11, color: RED, textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
                  Failed to log trade. Try again.
                </div>
              )}
              {!aiResult && valid && (
                <div style={{ fontSize: 11, color: DIM, textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
                  Tap Evaluate first to enable Log Trade
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
