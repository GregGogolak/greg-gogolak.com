'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNVDAData }      from '@/hooks/useNVDAData'
import { useMacroData }     from '@/hooks/useMacroData'
import { useNews }          from '@/hooks/useNews'
import { useFundamentals }  from '@/hooks/useFundamentals'
import { useAlerts }        from '@/hooks/useAlerts'
import { useNVDALive }      from '@/context/NVDALiveContext'
import LivePriceBubble      from '@/components/LivePriceBubble'
import { getThesisStatus, getBuyChecklist } from '@/lib/thesisEngine'
import { daysUntil } from '@/lib/calculations'
import { EARNINGS_DATE } from '@/lib/config'

import PricePanel    from '@/components/Dashboard/PricePanel'
import ThesisStatus  from '@/components/Dashboard/ThesisStatus'
import MacroPanel    from '@/components/Dashboard/MacroPanel'
import CatalystBar   from '@/components/Dashboard/CatalystBar'
import PositionPanel from '@/components/Dashboard/PositionPanel'
import SignalGauge   from '@/components/Dashboard/SignalGauge'
import BuyChecklist  from '@/components/Dashboard/BuyChecklist'
import NewsPanel     from '@/components/Dashboard/NewsPanel'
import SignalFeed    from '@/components/Dashboard/SignalFeed'

// ── Design tokens ──────────────────────────────────────────────────────────
const CARD = {
  background: '#13131e',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '18px',
  padding: '20px 24px',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
  cursor: 'default',
}

const HERO_CARD = {
  ...CARD,
  padding: '24px 28px',
}

const EYE = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.25)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  marginBottom: '16px',
  display: 'block',
}

function cardIn(e) {
  e.currentTarget.style.border        = '0.5px solid rgba(255,255,255,0.12)'
  e.currentTarget.style.transform     = 'translateY(-2px)'
  e.currentTarget.style.boxShadow     = '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
}
function cardOut(e) {
  e.currentTarget.style.border        = '0.5px solid rgba(255,255,255,0.07)'
  e.currentTarget.style.transform     = 'translateY(0)'
  e.currentTarget.style.boxShadow     = '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
}

// ── SentimentChip (kept, not rendered in the new layout) ───────────────────
function SentimentChip() {
  const [pulse, setPulse] = useState(null)
  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(res => {
        const latest = Array.isArray(res) ? res[0] : res
        if (latest?.marketPulse) setPulse(latest.marketPulse)
      })
      .catch(() => {})
  }, [])
  if (!pulse) return null
  return (
    <div style={{
      marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
      background: 'rgba(91,156,246,0.05)', border: '1px solid rgba(91,156,246,0.12)',
      display: 'flex', gap: '12px', alignItems: 'center',
    }}>
      <span style={{ fontSize: '9px', color: '#3d4a5c', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif' }}>PULSE</span>
      <span style={{ fontSize: '11px', color: '#eef2ff', fontFamily: 'Inter, sans-serif' }}>🧑 {pulse.retail.label}</span>
      <span style={{ color: '#3d4a5c' }}>·</span>
      <span style={{ fontSize: '11px', color: '#eef2ff', fontFamily: 'Inter, sans-serif' }}>🏦 {pulse.hedge.label}</span>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: priceData, loading: priceLoading }  = useNVDAData()
  const { data: macroData, loading: macroLoading }  = useMacroData()
  const { articles, loading: newsLoading }          = useNews()
  const { data: fundamentalsData }                  = useFundamentals()
  const { livePrice, wsConnected } = useNVDALive()
  useAlerts({ externalPriceData: priceData, externalMacroData: macroData })

  // Persisted state (KV-backed)
  const [positions,  setPositions]  = useState([])
  const [iranStatus, setIranStatus] = useState('ESCALATING')

  // Load positions + KV state on mount
  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(d => {
        setPositions(d.positions || [])
        setIranStatus(d.iranStatus || 'ESCALATING')
      })
      .catch(() => {})
  }, [])

  // Position CRUD
  const handleAddPosition = useCallback(async (pos) => {
    const res  = await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', payload: pos }),
    })
    const data = await res.json()
    setPositions(data.positions || [])
  }, [])

  const handleRemovePosition = useCallback(async (id) => {
    const res  = await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', payload: { id } }),
    })
    const data = await res.json()
    setPositions(data.positions || [])
  }, [])

  const handleIranChange = useCallback(async (status) => {
    setIranStatus(status)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setIran', payload: { status } }),
    })
  }, [])

  // Derived values
  const price          = priceData?.price   ?? null
  const sma200         = priceData?.sma200  ?? null
  const vix            = macroData?.vix?.level ?? 0
  const oilTwo         = macroData?.oil?.twoSessionPct ?? 0
  const qqqPct         = macroData?.qqq?.pctChange ?? 0
  const analystTarget  = fundamentalsData?.analystTarget ?? 264

  const nowSec         = Date.now() / 1000
  const hasBucketCNews = articles.some(a => a.bucket === 'C' && (nowSec - a.datetime) < 86400)

  const thesis = getThesisStatus({ price, sma200, oilTwoSessionPct: oilTwo, vix, hasBucketCNews })

  const checklistItems = getBuyChecklist({
    price:          price ?? 0,
    sma200:         sma200 ?? 0,
    analystTarget,
    hasBucketCNews,
    qqqPctChange:   qqqPct,
    vix,
    daysToEarnings: daysUntil(EARNINGS_DATE),
  })

  const passCount = checklistItems.filter(i => i.pass).length
  const loading   = priceLoading && !priceData

  // Macro display values
  const oilPrice  = macroData?.oil?.price
  const oilPct    = macroData?.oil?.pctChange
  const qqqPrice  = macroData?.qqq?.price
  const vixLevel  = macroData?.vix?.level

  const vixLabel  = !vixLevel ? '—' : vixLevel > 30 ? 'HIGH' : vixLevel > 20 ? 'ELEVATED' : 'LOW'
  const vixColor  = !vixLevel ? 'rgba(255,255,255,0.3)' : vixLevel > 30 ? '#ef4444' : vixLevel > 20 ? '#f59e0b' : '#22c55e'
  const vixBg     = !vixLevel ? 'rgba(255,255,255,0.04)' : vixLevel > 30 ? 'rgba(239,68,68,0.1)' : vixLevel > 20 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)'

  // Dynamic blooms
  const priceIsUp   = (priceData?.pctChange ?? 0) >= 0
  const priceBloom  = priceIsUp
    ? 'radial-gradient(ellipse at 20% 80%, rgba(34,197,94,0.06) 0%, transparent 60%)'
    : 'radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.06) 0%, transparent 60%)'
  const thesisBloom = thesis.status === 'INTACT'
    ? 'radial-gradient(ellipse at 20% 80%, rgba(34,197,94,0.06) 0%, transparent 60%)'
    : thesis.status === 'AT RISK'
    ? 'radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.06) 0%, transparent 60%)'
    : 'radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.06) 0%, transparent 60%)'

  // Inline row helper for macro card
  const macroRow = (name, valueNode, badgeNode, last = false) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {valueNode}
        {badgeNode}
      </div>
    </div>
  )

  const pctBadge = (pct) => pct == null ? null : (
    <span style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
      padding: '2px 7px', borderRadius: '9999px',
      background: pct >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color:      pct >= 0 ? '#22c55e' : '#ef4444',
    }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</span>
  )

  const monoVal = (text) => (
    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#f0f0f8' }}>{text}</span>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080f',
      padding: '88px 28px 40px', // 88 = 68px nav + 20px breathing room
      fontFamily: 'Inter, sans-serif',
      marginTop: '-68px',
    }}>

      {/* ── ROW 1 — HERO ──────────────────────────────────────────────────── */}
      <div className="dashboard-row-1" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
      }}>

        {/* Zone 1 — Live Price */}
        <div style={HERO_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          {/* Dynamic price bloom */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: priceBloom }} />
          <LivePriceBubble
            livePrice={livePrice}
            prevClose={priceData?.prevClose ?? null}
            pctChange={priceData?.pctChange ?? null}
            wsConnected={wsConnected}
            marketOpen={priceData?.marketOpen ?? null}
          />
          {sma200 != null && price != null && (
            <div style={{
              marginTop: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              200 SMA ${sma200.toFixed(2)} · {price > sma200 ? '+' : ''}{(((price - sma200) / sma200) * 100).toFixed(2)}% {price > sma200 ? 'above' : 'below'}
            </div>
          )}
        </div>

        {/* Zone 2 — Thesis Status */}
        <div style={HERO_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          {/* Dynamic thesis bloom */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: thesisBloom }} />
          <span style={EYE}>THESIS</span>
          <ThesisStatus
            status={thesis.status}
            triggers={thesis.triggers}
            price={price}
            sma200={sma200}
            loading={loading}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 0,
              padding: 0,
              overflow: 'visible',
            }}
          />
        </div>

        {/* Zone 3 — Signal Strength */}
        <div style={HERO_CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>SIGNAL STRENGTH</span>
          <SignalGauge passCount={passCount} totalCount={checklistItems.length} />
          <div style={{
            marginTop: '14px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.06em',
          }}>
            {passCount} / {checklistItems.length} CONDITIONS MET
          </div>
        </div>
      </div>

      {/* ── ROW 2 — SUPPORTING DATA ───────────────────────────────────────── */}
      <div className="dashboard-row-2" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
      }}>

        {/* Card 1 — Macro Signals */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>MACRO SIGNALS</span>
          {macroRow(
            'Brent Crude',
            monoVal(oilPrice ? `$${oilPrice.toFixed(2)}` : '—'),
            oilPct != null ? pctBadge(oilPct) : null,
          )}
          {macroRow(
            'QQQ',
            qqqPrice != null ? monoVal(`$${qqqPrice.toFixed(2)}`) : null,
            macroData?.qqq?.pctChange != null ? pctBadge(macroData.qqq.pctChange) : null,
          )}
          {macroRow(
            'VIX',
            monoVal(vixLevel ? vixLevel.toFixed(1) : '—'),
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
              padding: '2px 7px', borderRadius: '9999px',
              background: vixBg, color: vixColor,
            }}>{vixLabel}</span>,
            true,
          )}
        </div>

        {/* Card 2 — Entry Checklist */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ ...EYE, marginBottom: 0 }}>ENTRY CHECKLIST</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
              padding: '2px 8px', borderRadius: '9999px',
              background: passCount >= 5 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              color:      passCount >= 5 ? '#22c55e' : '#f59e0b',
              border: `0.5px solid ${passCount >= 5 ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            }}>{passCount} / {checklistItems.length}</span>
          </div>
          {checklistItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: i < checklistItems.length - 1 ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 700,
                  color:      item.pass ? '#22c55e' : '#ef4444',
                  background: item.pass ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `0.5px solid ${item.pass ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {item.pass ? '✓' : '✗'}
                </span>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '12px',
                  color: item.pass ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                }}>{item.label}</span>
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '11px',
                color: item.pass ? '#22c55e' : 'rgba(255,255,255,0.2)',
              }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Card 3 — Upcoming Catalysts */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>UPCOMING CATALYSTS</span>
          <CatalystBar
            iranStatus={iranStatus}
            onIranChange={handleIranChange}
            loading={macroLoading && !macroData}
          />
        </div>
      </div>

      {/* ── ROW 3 — CONTEXTUAL ────────────────────────────────────────────── */}
      <div className="dashboard-row-3" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 2fr',
        gap: '12px',
      }}>

        {/* Col 1 — Price History / Charts (2fr) */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>PRICE HISTORY</span>
          <PricePanel data={priceData} loading={loading} analystTarget={analystTarget} />
        </div>

        {/* Col 2 — SMA Distance (1fr) */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>SMA DISTANCE</span>

          {/* Current price */}
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '16px', fontWeight: 500,
            color: '#f0f0f8',
            marginBottom: '16px',
          }}>
            {price ? `$${price.toFixed(2)}` : '—'}
          </div>

          {/* 200d SMA row */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                200d SMA{sma200 != null && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: '6px' }}>
                    ${sma200.toFixed(2)}
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500,
                color: loading || !price || !sma200 ? 'rgba(255,255,255,0.2)'
                  : price >= sma200 ? '#22c55e' : '#ef4444',
              }}>
                {price && sma200
                  ? `${price >= sma200 ? '+' : ''}${((price - sma200) / sma200 * 100).toFixed(1)}%`
                  : '—'}
              </span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: price && sma200
                  ? `${Math.min(100, Math.abs((price - sma200) / sma200 * 100) * 4)}%`
                  : '0%',
                background: price && sma200 && price >= sma200
                  ? 'linear-gradient(90deg, rgba(34,197,94,0.3), #22c55e)'
                  : 'linear-gradient(90deg, rgba(239,68,68,0.3), #ef4444)',
                transition: 'width 1.2s cubic-bezier(0.25,1,0.5,1)',
              }} />
            </div>
          </div>

          {/* 50d SMA row */}
          {priceData?.sma50 != null && price != null && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  50d SMA<span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: '6px' }}>
                    ${priceData.sma50.toFixed(2)}
                  </span>
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500,
                  color: price >= priceData.sma50 ? '#22c55e' : '#ef4444',
                }}>
                  {price >= priceData.sma50 ? '+' : ''}{((price - priceData.sma50) / priceData.sma50 * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  width: `${Math.min(100, Math.abs((price - priceData.sma50) / priceData.sma50 * 100) * 4)}%`,
                  background: price >= priceData.sma50
                    ? 'linear-gradient(90deg, rgba(34,197,94,0.3), #22c55e)'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.3), #ef4444)',
                  transition: 'width 1.2s cubic-bezier(0.25,1,0.5,1)',
                }} />
              </div>
            </div>
          )}

          {/* Volume + 10d high */}
          <div style={{
            display: 'flex', gap: '12px',
            paddingTop: '12px', marginBottom: '12px',
            borderTop: '0.5px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>
                Vol vs Avg
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500,
                color: priceData?.volumeRatio == null ? 'rgba(255,255,255,0.2)'
                  : priceData.volumeRatio >= 1.5 ? '#f59e0b'
                  : priceData.volumeRatio >= 1   ? '#22c55e'
                  : 'rgba(255,255,255,0.4)',
              }}>
                {priceData?.volumeRatio != null ? `${priceData.volumeRatio.toFixed(1)}x` : '—'}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '3px' }}>
                % from 10d high
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 500,
                color: priceData?.pctBelowHigh == null ? 'rgba(255,255,255,0.2)'
                  : priceData.pctBelowHigh <= 1 ? '#22c55e'
                  : priceData.pctBelowHigh <= 5 ? '#f59e0b'
                  : '#ef4444',
              }}>
                {priceData?.pctBelowHigh != null ? `-${priceData.pctBelowHigh.toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          {/* Analyst consensus */}
          {analystTarget != null && price != null && (
            <div style={{ paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
                Analyst consensus
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '22px', fontWeight: 500,
                color: '#22c55e',
              }}>
                +{((analystTarget - price) / price * 100).toFixed(2)}%
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px', color: 'rgba(255,255,255,0.25)',
                marginTop: '2px',
              }}>
                target ${analystTarget.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Col 3 — Positions (1fr) */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <span style={EYE}>POSITIONS</span>
          <PositionPanel
            positions={positions}
            currentPrice={price}
            onAdd={handleAddPosition}
            onRemove={handleRemovePosition}
          />
        </div>

        {/* Col 4 — News Feed (2fr) */}
        <div style={CARD} onMouseEnter={cardIn} onMouseLeave={cardOut}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ ...EYE, marginBottom: 0 }}>NEWS FEED</span>
            {articles.length > 0 && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.25)',
              }}>
                {articles.length} articles
              </span>
            )}
          </div>
          <NewsPanel articles={articles} loading={newsLoading && articles.length === 0} />
          <SignalFeed articles={articles} />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .dashboard-row-1,
          .dashboard-row-2,
          .dashboard-row-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
