'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNVDAData }      from '@/hooks/useNVDAData'
import { useMacroData }     from '@/hooks/useMacroData'
import { useNews }          from '@/hooks/useNews'
import { useFundamentals }  from '@/hooks/useFundamentals'
import { useNVDALive }    from '@/context/NVDALiveContext'
import LivePriceBubble    from '@/components/LivePriceBubble'
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
      marginTop: '12px',
      padding: '10px 14px',
      borderRadius: '10px',
      background: 'rgba(91,156,246,0.05)',
      border: '1px solid rgba(91,156,246,0.12)',
      display: 'flex', gap: '12px', alignItems: 'center',
    }}>
      <span style={{ fontSize: '9px', color: '#3d4a5c', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif' }}>PULSE</span>
      <span style={{ fontSize: '11px', color: '#eef2ff', fontFamily: 'Inter, sans-serif' }}>🧑 {pulse.retail.label}</span>
      <span style={{ color: '#3d4a5c' }}>·</span>
      <span style={{ fontSize: '11px', color: '#eef2ff', fontFamily: 'Inter, sans-serif' }}>🏦 {pulse.hedge.label}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data: priceData, loading: priceLoading }  = useNVDAData()
  const { data: macroData, loading: macroLoading }  = useMacroData()
  const { articles, loading: newsLoading }          = useNews()
  const { data: fundamentalsData }                  = useFundamentals()
  const { livePrice, wsConnected } = useNVDALive()

  // Persisted state (KV-backed)
  const [positions,  setPositions]  = useState([])
  const [cash,       setCash]       = useState(0)
  const [iranStatus, setIranStatus] = useState('ESCALATING')

  // Load positions + KV state on mount
  useEffect(() => {
    fetch('/api/positions')
      .then(r => r.json())
      .then(d => {
        setPositions(d.positions || [])
        setCash(d.cash || 0)
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

  const handleSetCash = useCallback(async (amount) => {
    setCash(amount)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setCash', payload: { cash: amount } }),
    })
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

  const thesis = getThesisStatus({ price, sma200, oilTwoSessionPct: oilTwo, vix })

  const nowSec         = Date.now() / 1000
  const hasBucketCNews = articles.some(a => a.bucket === 'C' && (nowSec - a.datetime) < 86400)

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg, #080910)', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(91,156,246,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(91,156,246,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,9,16,0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '52px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo mark */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(91,156,246,0.3) 0%, rgba(91,156,246,0.08) 100%)',
            border: '1px solid rgba(91,156,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', color: '#5b9cf6',
          }}>⬡</div>
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: '15px', fontWeight: 600, color: '#eef2ff', letterSpacing: '0.01em',
          }}>
            NVDA <span style={{ color: '#5b9cf6' }}>Jarvis</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: loading ? '#fbbf24' : '#34d399',
              boxShadow: loading ? '0 0 6px #fbbf24' : '0 0 6px #34d399',
              animation: 'pulseDot 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '10px', color: '#3d4a5c', fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
              {loading ? 'LOADING' : 'LIVE'}
            </span>
          </div>

          {/* Thesis badge in header */}
          {thesis.status !== 'UNKNOWN' && (
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              padding: '2px 9px', borderRadius: '20px',
              color:       thesis.status === 'INTACT'  ? '#34d399' : thesis.status === 'AT RISK' ? '#fbbf24' : '#f87171',
              background:  thesis.status === 'INTACT'  ? 'rgba(52,211,153,0.1)' : thesis.status === 'AT RISK' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${thesis.status === 'INTACT' ? 'rgba(52,211,153,0.25)' : thesis.status === 'AT RISK' ? 'rgba(251,191,36,0.25)' : 'rgba(248,113,113,0.25)'}`,
              fontFamily: 'Inter, sans-serif',
            }}>
              {thesis.status}
            </span>
          )}
        </div>
      </header>

      {/* Main grid */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {/*
          Desktop 3-col layout:
            Col 1: Price (rows 1-2) │ Col 2: Macro      │ Col 3: Signals (rows 1-2)
                   Thesis+Pulse(r3) │        Catalyst   │        Signals
                                    │        Positions  │        News (row 3)
        */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: 'auto auto 1fr',
          gridTemplateAreas: `
            "price   macro     signals"
            "price   catalyst  signals"
            "thesis  position  news"
          `,
          gap: '16px',
          padding: '16px 24px 80px',
          maxWidth: '1400px',
          margin: '0 auto',
        }}
          className="dashboard-grid"
        >
          {/* ── PRICE  (col 1, rows 1-2) ─────────────────────────────── */}
          <div style={{ gridArea: 'price', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <LivePriceBubble
              livePrice={livePrice}
              prevClose={priceData?.prevClose ?? null}
              pctChange={priceData?.pctChange ?? null}
              wsConnected={wsConnected}
              marketOpen={priceData?.marketOpen ?? null}
            />
            <PricePanel data={priceData} loading={loading} analystTarget={analystTarget} />
          </div>

          {/* ── MACRO ENV  (col 2, row 1) ────────────────────────────── */}
          <div style={{ gridArea: 'macro' }}>
            <MacroPanel data={macroData} loading={macroLoading && !macroData} />
          </div>

          {/* ── SIGNALS  (col 3, rows 1-2) — gauge + entry checklist ─── */}
          <div style={{ gridArea: 'signals', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Signal gauge card */}
            <div style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '14px', padding: '18px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#3d4a5c', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Signal Strength
              </div>
              <SignalGauge passCount={passCount} totalCount={checklistItems.length} />
            </div>
            {/* Entry checklist card */}
            <div style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '14px', padding: '18px',
              flex: 1,
            }}>
              <BuyChecklist items={checklistItems} />
            </div>
          </div>

          {/* ── CATALYSTS  (col 2, row 2) ────────────────────────────── */}
          <div style={{ gridArea: 'catalyst' }}>
            <CatalystBar
              iranStatus={iranStatus}
              onIranChange={handleIranChange}
              loading={macroLoading && !macroData}
            />
          </div>

          {/* ── THESIS + PULSE  (col 1, row 3) ──────────────────────── */}
          <div style={{ gridArea: 'thesis', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ThesisStatus
              status={thesis.status}
              triggers={thesis.triggers}
              price={price}
              sma200={sma200}
              loading={loading}
              style={{ flex: 1 }}
            />
            <SentimentChip />
          </div>

          {/* ── POSITIONS  (col 2, row 3) ────────────────────────────── */}
          <div style={{ gridArea: 'position', display: 'flex', flexDirection: 'column' }}>
            <PositionPanel
              positions={positions}
              currentPrice={price}
              cash={cash}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
              onSetCash={handleSetCash}
              style={{ flex: 1 }}
            />
          </div>

          {/* ── NEWS  (col 3, row 3) ─────────────────────────────────── */}
          <div style={{ gridArea: 'news' }}>
            <NewsPanel articles={articles} loading={newsLoading && articles.length === 0} />
          </div>
        </div>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr 1fr !important;
            grid-template-rows: auto !important;
            grid-template-areas:
              "price    macro"
              "price    catalyst"
              "signals  signals"
              "thesis   position"
              "news     news" !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto !important;
            grid-template-areas:
              "price"
              "thesis"
              "signals"
              "macro"
              "catalyst"
              "position"
              "news" !important;
            padding: 12px 16px 80px !important;
          }
        }
      `}</style>
    </div>
  )
}
