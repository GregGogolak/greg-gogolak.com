'use client'
import { useEffect, useState, useCallback } from 'react'
import useNVDAData   from '@/hooks/useNVDAData'
import useMacroData  from '@/hooks/useMacroData'
import useNews       from '@/hooks/useNews'
import { getThesisStatus, getBuyChecklist } from '@/lib/thesisEngine'
import { daysUntil } from '@/lib/calculations'

import PricePanel    from '@/components/Dashboard/PricePanel'
import ThesisStatus  from '@/components/Dashboard/ThesisStatus'
import MacroPanel    from '@/components/Dashboard/MacroPanel'
import CatalystBar   from '@/components/Dashboard/CatalystBar'
import PositionPanel from '@/components/Dashboard/PositionPanel'
import SignalGauge   from '@/components/Dashboard/SignalGauge'
import BuyChecklist  from '@/components/Dashboard/BuyChecklist'
import NewsPanel     from '@/components/Dashboard/NewsPanel'

const EARNINGS_DATE = '2026-05-20'
const FOMC_DATE     = '2026-04-29'

export default function Dashboard() {
  const { data: priceData, loading: priceLoading }  = useNVDAData()
  const { data: macroData, loading: macroLoading }  = useMacroData()
  const { articles, loading: newsLoading }          = useNews()

  // Persisted state (KV-backed)
  const [positions,   setPositions]  = useState([])
  const [cash,        setCash]       = useState(0)
  const [iranStatus,  setIranStatus] = useState('ESCALATING')
  const [posLoading,  setPosLoading] = useState(true)

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
      .finally(() => setPosLoading(false))
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
      body: JSON.stringify({ action: 'remove', payload: id }),
    })
    const data = await res.json()
    setPositions(data.positions || [])
  }, [])

  const handleSetCash = useCallback(async (amount) => {
    setCash(amount)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setCash', payload: amount }),
    })
  }, [])

  const handleIranChange = useCallback(async (status) => {
    setIranStatus(status)
    await fetch('/api/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setIran', payload: status }),
    })
  }, [])

  // Derived values
  const price    = priceData?.price   ?? null
  const sma200   = priceData?.sma200  ?? null
  const vix      = macroData?.vix?.level ?? 0
  const oilTwo   = macroData?.oil?.twoSessionPct ?? 0
  const qqqPct   = macroData?.qqq?.pctChange ?? 0

  const thesis = getThesisStatus({ price, sma200, oilTwoSessionPct: oilTwo, vix })

  const checklistItems = getBuyChecklist({
    price:          price ?? 0,
    sma200:         sma200 ?? 0,
    analystTarget:  264,
    hasBucketCNews: false,
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
        {/* Desktop: 3-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateAreas: `
            "price   macro    gauge"
            "thesis  catalyst news"
            "thesis  position news"
          `,
          gap: '16px',
          padding: '20px 24px',
          maxWidth: '1400px',
          margin: '0 auto',
          alignItems: 'start',
        }}
          className="dashboard-grid"
        >
          {/* Column 1 — Price */}
          <div style={{ gridArea: 'price' }}>
            <PricePanel data={priceData} loading={loading} />
          </div>

          {/* Column 1 — Thesis */}
          <div style={{ gridArea: 'thesis' }}>
            <ThesisStatus
              status={thesis.status}
              triggers={thesis.triggers}
              price={price}
              sma200={sma200}
              loading={loading}
            />
          </div>

          {/* Column 2 — Macro */}
          <div style={{ gridArea: 'macro' }}>
            <MacroPanel data={macroData} loading={macroLoading && !macroData} />
          </div>

          {/* Column 2 — Catalysts + Iran */}
          <div style={{ gridArea: 'catalyst' }}>
            <CatalystBar
              iranStatus={iranStatus}
              onIranChange={handleIranChange}
              loading={macroLoading && !macroData}
            />
          </div>

          {/* Column 2 — Positions */}
          <div style={{ gridArea: 'position' }}>
            <PositionPanel
              positions={positions}
              currentPrice={price}
              cash={cash}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
              onSetCash={handleSetCash}
            />
          </div>

          {/* Column 3 — Gauge */}
          <div style={{ gridArea: 'gauge' }}>
            <div style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '14px', padding: '18px',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Signal Strength
              </div>
              <SignalGauge passCount={passCount} totalCount={checklistItems.length} />
            </div>
          </div>

          {/* Column 3 — Checklist (inside same card as gauge on wide screens looks odd — separate card) */}
          {/* We'll put checklist inline below gauge in col 3, and news spans lower */}
          <div style={{ gridArea: 'news', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Checklist */}
            <div style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '14px', padding: '18px',
            }}>
              <BuyChecklist items={checklistItems} />
            </div>
            {/* News */}
            <NewsPanel articles={articles} loading={newsLoading && articles.length === 0} />
          </div>
        </div>
      </main>

      {/* Responsive styles injected via style tag */}
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr 1fr !important;
            grid-template-areas:
              "price   macro"
              "thesis  catalyst"
              "thesis  position"
              "gauge   gauge"
              "news    news" !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
            grid-template-areas:
              "price"
              "thesis"
              "gauge"
              "macro"
              "catalyst"
              "position"
              "news" !important;
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
