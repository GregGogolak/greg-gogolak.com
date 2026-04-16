'use client'
import { useEffect, useRef } from 'react'

// Semicircle arc total length ≈ π * r = π * 90 ≈ 283
const ARC_LEN = 283

export default function SignalGauge({ passCount = 0, totalCount = 6 }) {
  const pathRef = useRef(null)
  const prev    = useRef(0)

  useEffect(() => {
    const score  = totalCount > 0 ? passCount / totalCount : 0
    const target = score * ARC_LEN
    const el     = pathRef.current
    if (!el) return

    // Animate from previous value
    const start = prev.current
    const dur   = 1200
    let startT  = null

    function step(ts) {
      if (!startT) startT = ts
      const p  = Math.min((ts - startT) / dur, 1)
      const e  = 1 - Math.pow(1 - p, 3)
      const v  = start + (target - start) * e
      el.setAttribute('stroke-dasharray', `${v} ${ARC_LEN}`)
      if (p < 1) requestAnimationFrame(step)
      else prev.current = target
    }
    requestAnimationFrame(step)
  }, [passCount, totalCount])

  const score = totalCount > 0 ? passCount / totalCount : 0
  const scoreColor = score >= 0.8 ? '#34d399' : score >= 0.5 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto' }}>
      <svg viewBox="0 0 220 130" style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#f87171" />
            <stop offset="45%"  stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path d="M 20 115 A 90 90 0 0 1 200 115"
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="10" strokeLinecap="round" />
        {/* Fill arc */}
        <path ref={pathRef}
          d="M 20 115 A 90 90 0 0 1 200 115"
          fill="none" stroke="url(#gauge-grad)"
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`0 ${ARC_LEN}`} />
        {/* Score */}
        <text x="110" y="96" textAnchor="middle"
          fontFamily="'Inter Tight', sans-serif"
          fontSize="28" fontWeight="300" fill={scoreColor}>
          {passCount}/{totalCount}
        </text>
      </svg>
      {/* SELL — aligns with left arc endpoint */}
      <span style={{
        position: 'absolute', bottom: '8px', left: '8px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: '#3d4a5c',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>Sell</span>
      {/* WAIT — aligns with arc midpoint (top centre) */}
      <span style={{
        position: 'absolute', bottom: '0px', left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: '#3d4a5c',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>Wait</span>
      {/* BUY — aligns with right arc endpoint */}
      <span style={{
        position: 'absolute', bottom: '8px', right: '8px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '10px', color: '#3d4a5c',
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>Buy</span>
    </div>
  )
}
