'use client'
import { useEffect, useRef, useState } from 'react'
import { daysUntil } from '@/lib/calculations'
import { EARNINGS_DATE, FOMC_DATE } from '@/lib/config'

// Catalyst ring — SVG circular progress
function CatalystRing({ label, date, cycleDays, color, loading }) {
  const circRef = useRef(null)
  const days    = daysUntil(date)
  const CIRC    = 251  // 2π * r=40

  useEffect(() => {
    const el = circRef.current
    if (!el || loading) return
    const elapsed  = Math.max(0, cycleDays - days)
    const fraction = Math.min(1, elapsed / cycleDays)
    let start = null
    const dur = 1400
    function step(ts) {
      if (!start) start = ts
      const p  = Math.min((ts - start) / dur, 1)
      const e  = 1 - Math.pow(1 - p, 2.5)
      el.setAttribute('stroke-dasharray', `${fraction * e * CIRC} ${CIRC}`)
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [days, cycleDays, loading])

  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <svg viewBox="0 0 100 100" style={{ width: '90px', height: '90px', display: 'block', margin: '0 auto 8px' }}>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle ref={circRef} cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`0 ${CIRC}`}
          transform="rotate(-90 50 50)" />
        <text x="50" y="46" textAnchor="middle"
          fontFamily="'Inter Tight', sans-serif" fontSize="18" fontWeight="300" fill="#eef2ff">
          {loading ? '—' : days}
        </text>
        <text x="50" y="60" textAnchor="middle"
          fontFamily="'Inter', sans-serif" fontSize="8" letterSpacing="0.05em" fill="#3d4a5c">
          DAYS
        </text>
      </svg>
      <div style={{ fontSize: '10px', color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '11px', color, fontFamily: "'Inter Tight', sans-serif" }}>{date}</div>
    </div>
  )
}

const IRAN_STATES = ['CEASEFIRE', 'ESCALATING', 'WAR']
const IRAN_COLORS = {
  CEASEFIRE:  { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  ESCALATING: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  WAR:        { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
}

export default function CatalystBar({ iranStatus = 'ESCALATING', onIranChange, loading }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Catalyst rings */}
      <div style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.065)',
        borderRadius: '14px', padding: '18px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Upcoming Catalysts
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <CatalystRing label="Earnings" date={EARNINGS_DATE} cycleDays={90}
            color="#fbbf24" loading={loading} />
          <CatalystRing label="FOMC" date={FOMC_DATE} cycleDays={45}
            color="#f87171" loading={loading} />
        </div>
      </div>

      {/* Iran toggle */}
      <div style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.065)',
        borderRadius: '14px', padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 500, color: '#3d4a5c', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Iran / Hormuz</span>
          <span style={{ fontSize: '10px', color: '#3d4a5c' }}>Manual · affects oil model</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {IRAN_STATES.map(state => {
            const active = state === iranStatus
            const s = IRAN_COLORS[state]
            return (
              <button key={state} onClick={() => onIranChange?.(state)} style={{
                flex: 1, padding: '7px 0', borderRadius: '8px',
                border: active ? `1px solid ${s.border}` : '1px solid rgba(255,255,255,0.065)',
                background: active ? s.bg : 'rgba(255,255,255,0.02)',
                color: active ? s.color : '#3d4a5c',
                fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'Inter, sans-serif',
              }}>
                {state}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
