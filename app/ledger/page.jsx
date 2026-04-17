'use client'

import { useEffect, useRef, useState } from 'react'
import { useNVDALive } from '@/context/NVDALiveContext'
import { calculateEstimatedPnL } from '@/lib/calculations'

// ─── Shared constants ─────────────────────────────────────────────────────────
const MEMBER_COLORS = [
  { stroke: 'rgba(59,130,246,0.95)', fill0: 'rgba(59,130,246,0.28)', fill1: 'rgba(59,130,246,0)', dot: 'rgba(59,130,246,1)', glow: 'rgba(59,130,246,0.5)' },
  { stroke: 'rgba(34,197,94,0.8)', fill0: 'rgba(34,197,94,0.18)', fill1: 'rgba(34,197,94,0)', dot: 'rgba(34,197,94,0.9)', glow: 'rgba(34,197,94,0.4)' },
  { stroke: 'rgba(245,158,11,0.8)', fill0: 'rgba(245,158,11,0.15)', fill1: 'rgba(245,158,11,0)', dot: 'rgba(245,158,11,0.9)', glow: 'rgba(245,158,11,0.4)' },
]
const fmtEuro = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── ScanLine ─────────────────────────────────────────────────────────────────
const ScanLine = () => (
  <div style={{
    position: 'fixed',
    top: 0, left: 0,
    width: '100%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.06), transparent)',
    animation: 'scanLine 10s linear infinite',
    pointerEvents: 'none',
    zIndex: 999,
  }} />
)

// ─── ConstellationBg ─────────────────────────────────────────────────────────
const ConstellationBg = () => {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const nodes = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.4,
    }))
    let id
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      })
      nodes.forEach((a, i) => {
        nodes.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 110) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(59,130,246,${0.06 * (1 - d / 110)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })
      nodes.forEach(n => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59,130,246,0.2)'
        ctx.fill()
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0, opacity: 0.5,
    }} />
  )
}

// ─── HeroSection ─────────────────────────────────────────────────────────────
const HeroSection = ({ data }) => {
  const [displayVal, setDisplayVal] = useState(0)
  const fundGross = data?.fundStats?.totalGrossUsd ?? 0
  const fundNet = data?.fundStats?.totalNetEur ?? 0

  useEffect(() => {
    if (!fundGross) return
    const duration = 900
    const start = performance.now()
    const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    const frame = (now) => {
      const p = Math.min((now - start) / duration, 1)
      setDisplayVal(Math.round(easeOutExpo(p) * fundGross))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [fundGross])

  return (
    <div style={{
      position: 'relative',
      padding: '36px 28px 0',
      zIndex: 2,
      animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Perspective grid behind hero */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden',
        backgroundImage: `linear-gradient(rgba(59,130,246,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.025) 1px, transparent 1px)`,
        backgroundSize: '44px 44px',
        maskImage: 'radial-gradient(ellipse at 50% 60%, black 20%, transparent 75%)',
      }} />

      {/* Blue radial bloom */}
      <div style={{
        position: 'absolute', top: '-60px', left: '50%',
        transform: 'translateX(-50%)',
        width: '600px', height: '300px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)',
        filter: 'blur(30px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '16px',
      }}>
        {/* Left — fund total */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px', color: 'rgba(59,130,246,0.55)',
            letterSpacing: '0.28em', textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'rgba(59,130,246,0.7)',
              boxShadow: '0 0 6px rgba(59,130,246,0.8)',
              animation: 'dotPulseLedger 2s ease-in-out infinite',
            }} />
            Fund Performance · Live
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '24px', fontWeight: '300',
                color: 'rgba(255,255,255,0.18)',
                marginTop: '10px',
              }}>$</span>
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: '600',
                color: '#f0f0f8',
                letterSpacing: '-2px', lineHeight: '1',
                animation: 'numberFlicker 9s ease-in-out infinite',
              }}>
                {displayVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '16px', fontWeight: '400',
              color: 'rgba(255,255,255,0.35)',
              marginLeft: '12px',
              marginBottom: '8px',
            }}>
              €{fmtEuro(fundNet)} net
            </span>
          </div>

          <div style={{
            display: 'flex', gap: '12px', marginTop: '10px',
            alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px', color: 'rgba(255,255,255,0.22)',
            }}>
              €{fmtEuro(data?.fundStats?.bestTradeEver?.net_eur ?? 0)} best trade · {data?.members?.length ?? 0} members
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px', color: '#22c55e',
              background: 'rgba(34,197,94,0.08)',
              border: '0.5px solid rgba(34,197,94,0.2)',
              padding: '2px 9px', borderRadius: '9999px',
            }}>
              {data?.fundStats?.totalOpenPositions ?? 0} open positions
            </span>
          </div>
        </div>

        {/* Right — mini stat cluster */}
        <div
          className="ledger-stat-cluster"
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'flex-end', gap: '10px',
            animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both',
          }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '9px', color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em',
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(255,255,255,0.07)',
            padding: '5px 12px', borderRadius: '9999px',
          }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 6px rgba(34,197,94,0.8)',
              animation: 'dotPulseLedger 1.5s ease-in-out infinite',
            }} />
            NVDA
          </div>

          {/* Connected stat pills */}
          <div className="ledger-stat-pills" style={{ display: 'flex', gap: '1px' }}>
            {[
              { val: data?.members?.length ?? 0, label: 'Members' },
              { val: data?.fundStats?.totalTrades ?? 0, label: 'Trades' },
              { val: `${data?.fundStats?.winRate ?? 0}%`, label: 'Win Rate' },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                padding: '9px 16px', textAlign: 'center',
                borderRadius: i === 0 ? '10px 0 0 10px' : i === 2 ? '0 10px 10px 0' : '0',
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '16px', fontWeight: '600',
                  color: 'rgba(255,255,255,0.7)',
                }}>{s.val}</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '7px', color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  marginTop: '2px',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EquityCurveSection ───────────────────────────────────────────────────────
const EquityCurveSection = ({ members }) => {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!members || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const DPR = window.devicePixelRatio || 1

    const resize = () => {
      const w = canvas.parentElement.clientWidth
      canvas.width = w * DPR
      canvas.height = 280 * DPR
      canvas.style.width = w + 'px'
      canvas.style.height = '280px'
      ctx.scale(DPR, DPR)
    }
    resize()

    // Build unified timeline across all members
    const allDates = new Set()
    members.forEach(m => (m.equityCurve ?? []).forEach(p => allDates.add(p.date)))
    const sortedDates = Array.from(allDates).sort()
    if (sortedDates.length < 2) return

    // For each member interpolate values across all dates
    const memberSeries = members.map(m => {
      const curve = m.equityCurve ?? []
      const dateMap = {}
      curve.forEach(p => { dateMap[p.date] = p.value })
      let lastVal = 0
      return sortedDates.map(d => {
        if (dateMap[d] !== undefined) lastVal = dateMap[d]
        return lastVal
      })
    })

    const allValues = memberSeries.flat()
    const maxVal = Math.max(...allValues, 1) * 1.1
    const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)

    const W = canvas.width / DPR
    const H = canvas.height / DPR
    const PAD_LEFT = 48, PAD_RIGHT = 64, PAD_TOP = 16, PAD_BOTTOM = 28

    const minTime = new Date(sortedDates[0]).getTime()
    const maxTime = new Date(sortedDates[sortedDates.length - 1]).getTime()
    const timeRange = maxTime - minTime || 1
    const xScale = (i) => PAD_LEFT + ((new Date(sortedDates[i]).getTime() - minTime) / timeRange) * (W - PAD_LEFT - PAD_RIGHT)
    const yScale = (v) => H - PAD_BOTTOM - ((v / maxVal) * (H - PAD_TOP - PAD_BOTTOM))

    let startTime = null

    const draw = (ts) => {
      if (!startTime) startTime = ts
      const rawT = Math.min((ts - startTime) / 2600, 1)
      const prog = easeOutExpo(rawT)

      ctx.clearRect(0, 0, W, H)

      // Horizontal grid lines (always full-width, no clip)
      for (let i = 1; i <= 4; i++) {
        const v = maxVal * i / 5
        const y = yScale(v)
        ctx.beginPath()
        ctx.moveTo(PAD_LEFT, y); ctx.lineTo(W - PAD_RIGHT, y)
        ctx.strokeStyle = 'rgba(255,255,255,0.035)'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 10]); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '9px Courier New'
        ctx.textAlign = 'right'
        ctx.fillText('€' + Math.round(v / 1000) + 'k', PAD_LEFT - 4, y + 3)
      }

      // Zero line
      ctx.beginPath()
      ctx.moveTo(PAD_LEFT, yScale(0)); ctx.lineTo(W - PAD_RIGHT, yScale(0))
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.5; ctx.stroke()

      // Date labels
      const labelCount = Math.min(4, sortedDates.length)
      for (let i = 0; i < labelCount; i++) {
        const idx = Math.floor(i * (sortedDates.length - 1) / (labelCount - 1))
        const x = xScale(idx)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '9px Courier New'
        ctx.textAlign = 'center'
        ctx.fillText(sortedDates[idx]?.slice(0, 7) ?? '', x, H - 6)
      }

      // Clip: outer boundary prevents overflow, inner reveals progressively
      const clipRight = PAD_LEFT + prog * (W - PAD_LEFT - PAD_RIGHT)

      ctx.save()
      ctx.beginPath()
      ctx.rect(PAD_LEFT, 0, W - PAD_LEFT - PAD_RIGHT + 12, H)
      ctx.clip()

      ctx.save()
      ctx.beginPath()
      ctx.rect(PAD_LEFT, 0, Math.max(0, clipRight - PAD_LEFT), H)
      ctx.clip()

      // Draw members back to front (all points, clip handles reveal)
      ;[...memberSeries].reverse().forEach((series, ri) => {
        const ci = memberSeries.length - 1 - ri
        const col = MEMBER_COLORS[ci] ?? MEMBER_COLORS[0]
        const pts = series.map((v, i) => ({ x: xScale(i), y: yScale(v) }))
        if (pts.length < 2) return

        // Filled area
        const grad = ctx.createLinearGradient(0, PAD_TOP, 0, H - PAD_BOTTOM)
        grad.addColorStop(0, col.fill0)
        grad.addColorStop(1, col.fill1)
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2
          const my = (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.lineTo(pts[pts.length - 1].x, yScale(0))
        ctx.lineTo(pts[0].x, yScale(0))
        ctx.closePath()
        ctx.fillStyle = grad; ctx.fill()

        // Stroke line
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) {
          const mx = (pts[i].x + pts[i + 1].x) / 2
          const my = (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.strokeStyle = col.stroke
        ctx.lineWidth = ci === 0 ? 2 : 1.5
        ctx.lineJoin = 'round'; ctx.stroke()
      })

      ctx.restore() // inner clip

      // Endpoint glow + dot — outside inner clip so full dot radius renders without being cut
      if (prog > 0.02) {
        const floatIdx = prog * (sortedDates.length - 1)
        const i0 = Math.floor(floatIdx)
        const i1 = Math.min(i0 + 1, sortedDates.length - 1)
        const frac = floatIdx - i0

        ;[...memberSeries].reverse().forEach((series, ri) => {
          const ci = memberSeries.length - 1 - ri
          const col = MEMBER_COLORS[ci] ?? MEMBER_COLORS[0]
          const yAtEdge = series[i0] + (series[i1] - series[i0]) * frac
          const xEdge = Math.min(clipRight, W - PAD_RIGHT - 4)
          const yEdge = yScale(yAtEdge)

          const grd = ctx.createRadialGradient(xEdge, yEdge, 0, xEdge, yEdge, 18)
          grd.addColorStop(0, col.glow); grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.beginPath(); ctx.arc(xEdge, yEdge, 18, 0, Math.PI * 2)
          ctx.fillStyle = grd; ctx.fill()

          ctx.beginPath(); ctx.arc(xEdge, yEdge, 4, 0, Math.PI * 2)
          ctx.fillStyle = col.dot; ctx.fill()
        })
      }

      ctx.restore() // outer clip

      // Labels — outside both clips so text is never cut; x position capped to stay within chart area
      if (prog > 0.9) {
        const floatIdx = prog * (sortedDates.length - 1)
        const i0 = Math.floor(floatIdx)
        const i1 = Math.min(i0 + 1, sortedDates.length - 1)
        const frac = floatIdx - i0

        ;[...memberSeries].reverse().forEach((series, ri) => {
          const ci = memberSeries.length - 1 - ri
          const yAtEdge = series[i0] + (series[i1] - series[i0]) * frac
          const xEdge = Math.min(clipRight, W - PAD_RIGHT)
          const yEdge = yScale(yAtEdge)
          const m = members[ci]
          if (m) {
            ctx.fillStyle = 'rgba(255,255,255,0.75)'
            ctx.font = '500 10px Inter'
            ctx.textAlign = 'right'
            const initials = `${m.firstName?.[0] ?? m.name?.[0] ?? ''}${m.lastName?.[0] ?? m.name?.[1] ?? ''}`.toUpperCase()
            const labelWidth = ctx.measureText(initials).width
            const labelX = Math.min(xEdge - 10, W - PAD_RIGHT - labelWidth)
            ctx.fillText(initials, labelX, yEdge - 9)
          }
        })
      }

      if (rawT < 1) animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [members])

  return (
    <div style={{
      padding: '24px 28px 0',
      position: 'relative', zIndex: 2,
      animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8px', color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.22em', textTransform: 'uppercase',
        marginBottom: '12px',
      }}>
        Equity Curves
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
        <div style={{ display: 'flex', gap: '14px' }}>
          {(members ?? []).map((m, i) => {
            const cols = ['rgba(59,130,246,0.9)', 'rgba(34,197,94,0.8)', 'rgba(245,158,11,0.8)']
            return (
              <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>
                <div style={{ width: '16px', height: '2px', borderRadius: '1px', background: cols[i] ?? cols[0], boxShadow: `0 0 4px ${cols[i] ?? cols[0]}` }} />
                {m.name}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(180deg, rgba(11,11,22,0.9) 0%, rgba(7,7,14,0.97) 100%)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '20px 20px 12px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top shimmer border */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.25), rgba(255,255,255,0.08), rgba(59,130,246,0.25), transparent)',
        }} />
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '280px' }} />
      </div>
    </div>
  )
}

// ─── MembersSection ───────────────────────────────────────────────────────────
const MembersSection = ({ members }) => {
  if (!members) return null
  const sorted = [...members].sort((a, b) => (b.totalNetEur ?? 0) - (a.totalNetEur ?? 0))
  const fundTotal = sorted.reduce((s, m) => s + (m.totalNetEur ?? 0), 0)

  const AVATAR_STYLES = [
    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', color: 'rgba(59,130,246,0.95)', glow: 'rgba(59,130,246,0.2)' },
    { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', color: 'rgba(34,197,94,0.75)' },
    { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' },
  ]

  return (
    <div style={{
      padding: '24px 28px 0',
      position: 'relative', zIndex: 2,
      animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8px', color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '12px',
      }}>
        Members
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
      </div>

      <div style={{ display: 'grid', gap: '10px' }}>
        {sorted.map((member, i) => {
          const av = AVATAR_STYLES[i] ?? AVATAR_STYLES[2]
          const initials = `${member.firstName?.[0] ?? member.name?.[0] ?? ''}${member.lastName?.[0] ?? member.name?.[1] ?? ''}`.toUpperCase()
          const name = member.name ?? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
          const pnl = member.totalNetEur ?? 0
          const winRate = member.winRate ?? 0
          const trades = member.totalTrades ?? 0
          const bestTrade = member.bestTrade ?? 0
          const worstTrade = member.worstTrade ?? 0
          const avgHold = member.avgHoldDays ?? 0
          const fundShare = fundTotal > 0 ? (pnl / fundTotal) * 100 : 0
          const isFirst = i === 0

          return (
            <div
              key={member.userId}
              style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #111120 0%, #0d0d1a 100%)',
                border: `0.5px solid ${isFirst ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.07)'}`,
                borderLeft: isFirst ? '2px solid rgba(59,130,246,0.4)' : undefined,
                borderRadius: '18px',
                padding: '18px 20px',
                overflow: 'hidden',
                transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                animation: isFirst ? 'glowPulse 4s ease-in-out infinite' : undefined,
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Top edge highlight */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                background: isFirst
                  ? 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), rgba(255,255,255,0.08), rgba(59,130,246,0.2), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
              }} />

              {/* Shimmer sweep on first place */}
              {isFirst && (
                <div style={{
                  position: 'absolute', top: '-50%', left: '-20%',
                  width: '35px', height: '200%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)',
                  animation: 'shimmerSweep 7s ease-in-out infinite',
                  pointerEvents: 'none', zIndex: 1,
                }} />
              )}

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <div style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '32px', fontWeight: '800',
                  color: isFirst ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                  minWidth: '30px', lineHeight: '1',
                }}>{i + 1}</div>

                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '600', flexShrink: 0,
                  background: av.bg,
                  border: `0.5px solid ${av.border}`,
                  color: av.color,
                  boxShadow: av.glow ? `0 0 20px ${av.glow}, 0 0 40px ${av.glow}55` : 'none',
                }}>{initials}</div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.88)',
                    marginBottom: '3px', flexWrap: 'wrap',
                  }}>
                    {name}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px', color: 'rgba(255,255,255,0.2)',
                    letterSpacing: '0.06em',
                  }}>{trades} trades · joined {member.equityCurve?.[0]?.date?.slice(0, 7) ?? '—'}</div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '22px', fontWeight: '700',
                    color: pnl >= 0 ? '#22c55e' : '#ef4444',
                    letterSpacing: '-0.5px',
                  }}>{pnl >= 0 ? '+' : ''}€{fmtEuro(Math.abs(pnl))}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px', color: 'rgba(255,255,255,0.2)',
                    marginTop: '2px',
                  }}>{(member.thisMonthPnl ?? 0) >= 0 ? '+' : ''}€{fmtEuro(Math.abs(member.thisMonthPnl ?? 0))} this mo.</div>
                </div>
              </div>

              {/* Progress bars */}
              <div style={{ display: 'grid', gap: '6px', marginBottom: '12px' }}>
                {[
                  { label: 'Win Rate', value: winRate, color: 'rgba(59,130,246,0.8)', display: `${winRate}%`, delay: `${0.3 + i * 0.1}s` },
                  { label: 'Fund Share', value: fundShare, color: 'rgba(34,197,94,0.7)', display: `${fundShare.toFixed(1)}%`, delay: `${0.4 + i * 0.1}s` },
                  { label: 'Fee Share', value: member.feeShare ?? 0, color: 'rgba(245,158,11,0.6)', display: `${(member.feeShare ?? 0).toFixed(1)}%`, delay: `${0.5 + i * 0.1}s` },
                ].map(bar => (
                  <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '8px', color: 'rgba(255,255,255,0.2)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      width: '72px', flexShrink: 0,
                    }}>{bar.label}</div>
                    <div style={{
                      flex: 1, height: '3px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '2px', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: `${Math.min(Math.max(bar.value, 0), 100)}%`,
                        background: bar.color,
                        transform: 'scaleX(0)', transformOrigin: 'left',
                        animation: `barGrowLedger 1s cubic-bezier(0.16,1,0.3,1) ${bar.delay} both`,
                      }} />
                    </div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '9px', color: 'rgba(255,255,255,0.35)',
                      width: '56px', textAlign: 'right', flexShrink: 0,
                    }}>{bar.display}</div>
                  </div>
                ))}
              </div>

              {/* Stat pills */}
              <div style={{ display: 'flex', gap: '1px' }}>
                {[
                  { val: `+€${fmtEuro(bestTrade)}`, label: 'Best Trade', color: '#22c55e' },
                  { val: `-€${fmtEuro(Math.abs(worstTrade))}`, label: 'Worst Trade', color: '#ef4444' },
                  { val: `${avgHold}d`, label: 'Avg Hold', color: 'rgba(255,255,255,0.6)' },
                  { val: `${winRate}%`, label: 'Win Rate', color: 'rgba(59,130,246,0.85)' },
                  { val: trades, label: 'Trades', color: 'rgba(255,255,255,0.5)' },
                ].map((s, si) => (
                  <div key={s.label} style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.02)',
                    border: '0.5px solid rgba(255,255,255,0.05)',
                    padding: '8px 4px', textAlign: 'center',
                    borderRadius: si === 0 ? '8px 0 0 8px' : si === 4 ? '0 8px 8px 0' : '0',
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '11px', fontWeight: '600', color: s.color,
                    }}>{s.val}</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '7px', color: 'rgba(255,255,255,0.18)',
                      letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '2px',
                    }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AwardsSection ────────────────────────────────────────────────────────────
const AwardsSection = ({ members }) => {
  if (!members || members.length === 0) return null

  const awards = [
    {
      title: 'Most Profitable',
      accent: 'rgba(34,197,94,0.5)',
      dotColor: '#22c55e',
      valColor: '#22c55e',
      winner: [...members].sort((a, b) => (b.totalNetEur ?? 0) - (a.totalNetEur ?? 0))[0],
      runner: [...members].sort((a, b) => (b.totalNetEur ?? 0) - (a.totalNetEur ?? 0))[1],
      getValue: m => `+€${fmtEuro(m?.totalNetEur ?? 0)}`,
      fillWidth: () => 100,
      runnerVal: m => `+€${fmtEuro(m?.totalNetEur ?? 0)}`,
    },
    {
      title: 'Best Win Rate',
      accent: 'rgba(59,130,246,0.5)',
      dotColor: 'rgba(59,130,246,0.85)',
      valColor: 'rgba(59,130,246,0.9)',
      winner: [...members].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0],
      runner: [...members].sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[1],
      getValue: m => `${m?.winRate ?? 0}%`,
      fillWidth: () => Math.max(...members.map(m => m.winRate ?? 0)),
      runnerVal: m => `${m?.winRate ?? 0}%`,
    },
    {
      title: 'Best Single Trade',
      accent: 'rgba(255,255,255,0.22)',
      dotColor: 'rgba(255,255,255,0.4)',
      valColor: '#f0f0f8',
      winner: [...members].sort((a, b) => (b.bestTrade ?? 0) - (a.bestTrade ?? 0))[0],
      runner: [...members].sort((a, b) => (b.bestTrade ?? 0) - (a.bestTrade ?? 0))[1],
      getValue: m => `+€${fmtEuro(m?.bestTrade ?? 0)}`,
      fillWidth: () => 100,
      runnerVal: m => `+€${fmtEuro(m?.bestTrade ?? 0)}`,
    },
    {
      title: 'Best This Month',
      accent: 'rgba(245,158,11,0.5)',
      dotColor: 'rgba(245,158,11,0.8)',
      valColor: '#f59e0b',
      winner: [...members].sort((a, b) => (b.thisMonthPnl ?? 0) - (a.thisMonthPnl ?? 0))[0],
      runner: [...members].sort((a, b) => (b.thisMonthPnl ?? 0) - (a.thisMonthPnl ?? 0))[1],
      getValue: m => `+€${fmtEuro(m?.thisMonthPnl ?? 0)}`,
      fillWidth: () => 100,
      runnerVal: m => `+€${fmtEuro(m?.thisMonthPnl ?? 0)}`,
    },
    {
      title: 'Most Disciplined',
      accent: 'rgba(239,68,68,0.4)',
      dotColor: 'rgba(239,68,68,0.7)',
      valColor: '#ef4444',
      winner: [...members].sort((a, b) => Math.abs(a.maxDrawdown ?? 0) - Math.abs(b.maxDrawdown ?? 0))[0],
      runner: [...members].sort((a, b) => Math.abs(a.maxDrawdown ?? 0) - Math.abs(b.maxDrawdown ?? 0))[1],
      getValue: m => `€${fmtEuro(Math.abs(m?.maxDrawdown ?? 0))}`,
      fillWidth: (ms) => {
        const vals = ms.map(m => Math.abs(m.maxDrawdown ?? 0))
        const min = Math.min(...vals), max = Math.max(...vals)
        const winner = [...ms].sort((a, b) => Math.abs(a.maxDrawdown ?? 0) - Math.abs(b.maxDrawdown ?? 0))[0]
        return max > min ? (1 - (Math.abs(winner?.maxDrawdown ?? 0) - min) / (max - min)) * 100 : 50
      },
      runnerVal: m => `€${fmtEuro(Math.abs(m?.maxDrawdown ?? 0))}`,
      subtitle: 'Lowest drawdown',
    },
    {
      title: 'Most Active',
      accent: 'rgba(139,92,246,0.5)',
      dotColor: 'rgba(139,92,246,0.8)',
      valColor: 'rgba(139,92,246,0.9)',
      winner: [...members].sort((a, b) => (b.totalTrades ?? 0) - (a.totalTrades ?? 0))[0],
      runner: [...members].sort((a, b) => (b.totalTrades ?? 0) - (a.totalTrades ?? 0))[1],
      getValue: m => `${m?.totalTrades ?? 0}`,
      fillWidth: () => 100,
      runnerVal: m => `${m?.totalTrades ?? 0} trades`,
      subtitle: 'trades executed',
    },
  ]

  return (
    <div style={{
      padding: '24px 28px 0',
      position: 'relative', zIndex: 2,
      animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.35s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8px', color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '12px',
      }}>
        Awards
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {awards.map((award, idx) => {
          const winnerName = award.winner
            ? (award.winner.name ?? `${award.winner.firstName ?? ''} ${award.winner.lastName ?? ''}`.trim())
            : '—'
          const runnerName = award.runner
            ? (award.runner.name ?? `${award.runner.firstName ?? ''} ${award.runner.lastName ?? ''}`.trim())
            : '—'
          const fw = typeof award.fillWidth === 'function' ? award.fillWidth(members) : 100

          return (
            <div
              key={award.title}
              style={{
                background: 'linear-gradient(135deg, #0f0f1c 0%, #0b0b16 100%)',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '16px 18px',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                background: 'rgba(255,255,255,0.04)',
              }} />

              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '8px', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: award.accent,
                marginBottom: '10px',
              }}>
                <div style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: award.dotColor,
                }} />
                {award.title}
              </div>

              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '22px', fontWeight: '700',
                letterSpacing: '-0.5px', color: award.valColor,
                marginBottom: '3px',
              }}>{award.winner ? award.getValue(award.winner) : '—'}</div>

              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                {winnerName}
                {award.subtitle && <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '10px' }}> · {award.subtitle}</span>}
              </div>

              <div style={{
                height: '2px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '1px', overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <div style={{
                  height: '100%', borderRadius: '1px',
                  width: `${Math.min(Math.max(fw, 0), 100)}%`,
                  background: `linear-gradient(90deg, ${award.accent.replace('0.5)', '0.3)')}, ${award.dotColor})`,
                  transform: 'scaleX(0)', transformOrigin: 'left',
                  animation: `barGrowLedger 1.2s cubic-bezier(0.16,1,0.3,1) ${0.5 + idx * 0.08}s both`,
                }} />
              </div>

              {award.runner && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '0.5px solid rgba(255,255,255,0.04)',
                }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>{runnerName}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px', color: 'rgba(255,255,255,0.3)',
                  }}>{award.runnerVal(award.runner)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AllOpenPositions ─────────────────────────────────────────────────────────
const AllOpenPositions = ({ data, livePrice }) => {
  if (!data?.allOpenPositions?.length) return null
  return (
    <div style={{
      padding: '24px 28px 0',
      position: 'relative', zIndex: 2,
      animation: 'ledgerFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.45s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '8px', color: 'rgba(255,255,255,0.18)',
        letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '12px',
      }}>
        Open Positions
        <div style={{ flex: 1, height: '0.5px', background: 'linear-gradient(90deg, rgba(255,255,255,0.07), transparent)' }} />
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #14141f 0%, #111119 100%)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '20px 24px',
        boxShadow: `
          0 12px 40px rgba(0,0,0,0.5),
          0 4px 16px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.07)
        `,
      }}>
        {data.allOpenPositions.map((pos, i) => {
          const estimated = livePrice
            ? calculateEstimatedPnL(pos, livePrice)
            : null
          return (
            <div
              key={pos.id ?? i}
              style={{
                padding: '12px 0',
                borderBottom: i < data.allOpenPositions.length - 1
                  ? '0.5px solid rgba(255,255,255,0.04)'
                  : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'rgba(255,255,255,0.85)',
                  }}>{pos.shares?.toLocaleString()} shares</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '9px',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    background: 'rgba(59,130,246,0.1)',
                    border: '0.5px solid rgba(59,130,246,0.25)',
                    color: 'rgba(59,130,246,0.8)',
                    letterSpacing: '0.06em',
                  }}>{pos.type ?? 'CONVICTION'}</span>
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.28)',
                  letterSpacing: '0.02em',
                }}>
                  ${pos.entryPrice} entry · {pos.entryDate} · {estimated?.daysHeld ?? 0}d held
                </div>
                {pos.memberName && (
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.45)',
                    marginTop: '3px',
                  }}>{pos.memberName}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexShrink: 0 }}>
                {estimated && (
                  <>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '8px',
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginBottom: '3px',
                      }}>Est. Gross</div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: estimated.estimatedGross >= 0 ? '#22c55e' : '#ef4444',
                        letterSpacing: '-0.3px',
                      }}>
                        {estimated.estimatedGross >= 0 ? '+' : ''}${Math.round(estimated.estimatedGross).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '8px',
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginBottom: '3px',
                      }}>Est. Net</div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: estimated.estimatedNetEur >= 0 ? '#22c55e' : '#ef4444',
                        letterSpacing: '-0.3px',
                      }}>
                        {estimated.estimatedNetEur >= 0 ? '+' : ''}€{Math.round(estimated.estimatedNetEur).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '8px',
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginBottom: '3px',
                      }}>Running Cost</div>
                      <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '13px',
                        color: 'rgba(239,68,68,0.7)',
                        letterSpacing: '-0.3px',
                      }}>
                        -${Math.round(estimated.totalCosts).toLocaleString()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── LedgerPage ──────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { livePrice } = useNVDALive()

  useEffect(() => {
    fetch('/api/ledger')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: '#07070e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ConstellationBg />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'rgba(59,130,246,0.4)',
            animation: `dotPulseLedger 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )

  if (error) return (
    <div style={{
      minHeight: '100vh',
      background: '#07070e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px', color: 'rgba(239,68,68,0.5)',
      }}>{error}</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07070e',
      fontFamily: 'Inter, sans-serif',
      color: '#f0f0f8',
      paddingBottom: '60px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <ScanLine />
      <ConstellationBg />
      <HeroSection data={data} />
      <EquityCurveSection members={data?.members} />
      <MembersSection members={data?.members} />
      <AwardsSection members={data?.members} />
      <AllOpenPositions data={data} livePrice={livePrice} />
    </div>
  )
}
