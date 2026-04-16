'use client'
import { useEffect, useState, useCallback } from 'react'
import { useNVDAData }      from '@/hooks/useNVDAData'
import { useMacroData }     from '@/hooks/useMacroData'
import { useNews }          from '@/hooks/useNews'
import { useFundamentals }  from '@/hooks/useFundamentals'
import { useAlerts }        from '@/hooks/useAlerts'
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
import SignalFeed    from '@/components/Dashboard/SignalFeed'

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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg, #080910)', position: 'relative', overflow: 'hidden', marginTop: '-68px', paddingTop: '68px' }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(91,156,246,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(91,156,246,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Main grid — 3 independent flex columns, no row spanning */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
          gap: '16px',
          padding: '16px 24px 80px',
          maxWidth: '1400px',
          margin: '0 auto',
          alignItems: 'start',
        }}
          className="dashboard-grid"
        >
          {/* ── COL 1 ── price + thesis ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
            <LivePriceBubble
              livePrice={livePrice}
              prevClose={priceData?.prevClose ?? null}
              pctChange={priceData?.pctChange ?? null}
              wsConnected={wsConnected}
              marketOpen={priceData?.marketOpen ?? null}
            />
            <PricePanel data={priceData} loading={loading} analystTarget={analystTarget} />
          </div>

          {/* ── COL 2 ── macro + catalysts + positions ───────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
            <MacroPanel data={macroData} loading={macroLoading && !macroData} />
            <CatalystBar
              iranStatus={iranStatus}
              onIranChange={handleIranChange}
              loading={macroLoading && !macroData}
            />
            <PositionPanel
              positions={positions}
              currentPrice={price}
              onAdd={handleAddPosition}
              onRemove={handleRemovePosition}
            />
          </div>

          {/* ── COL 3 ── thesis + signals + checklist + news ────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>
            <ThesisStatus
              status={thesis.status}
              triggers={thesis.triggers}
              price={price}
              sma200={sma200}
              loading={loading}
            />
            <SentimentChip />
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
            <div style={{
              background: 'rgba(255,255,255,0.028)',
              border: '1px solid rgba(255,255,255,0.065)',
              borderRadius: '14px', padding: '18px',
            }}>
              <BuyChecklist items={checklistItems} />
            </div>
            <NewsPanel articles={articles} loading={newsLoading && articles.length === 0} />
            <SignalFeed articles={articles} />
          </div>
        </div>
      </main>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            padding: 12px 16px 80px !important;
          }
        }
      `}</style>
    </div>
  )
}
