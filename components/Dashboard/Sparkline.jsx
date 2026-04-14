'use client'
import { useRef, useEffect, useState } from 'react'

const SMA_COLOR  = 'rgba(91,156,246,0.35)'
const LINE_COLOR = '#f87171'    // red = below 200 SMA; swap to #34d399 if above
const FILL_START = 'rgba(248,113,113,0.22)'
const FILL_END   = 'rgba(248,113,113,0)'

export default function Sparkline({ prices = [], sma200 = null }) {
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [tipPos, setTipPos]     = useState({ x: 0, y: 0 })

  const isAboveSma = prices.length && sma200 && prices[prices.length - 1] > sma200
  const lineColor  = isAboveSma ? '#34d399' : '#f87171'
  const fillStart  = isAboveSma ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'

  function draw(hIdx = -1) {
    const canvas = canvasRef.current
    if (!canvas || !prices.length) return
    const dpr = window.devicePixelRatio || 1
    const W   = canvas.clientWidth
    const H   = canvas.clientHeight
    canvas.width  = W * dpr
    canvas.height = H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const PAD_T = 10, PAD_B = 8, PAD_L = 2, PAD_R = 2
    const cW    = W - PAD_L - PAD_R
    const cH    = H - PAD_T - PAD_B
    const min   = Math.min(...prices) - 2
    const max   = Math.max(...prices) + 2
    const range = max - min

    const toX = i  => PAD_L + (i / (prices.length - 1)) * cW
    const toY = p  => PAD_T + (1 - (p - min) / range) * cH

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth   = 1
    for (let i = 0; i <= 3; i++) {
      const y = PAD_T + (i / 3) * cH
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke()
    }

    // 200 SMA reference line
    if (sma200 && sma200 > min && sma200 < max) {
      const sy = toY(sma200)
      ctx.strokeStyle = SMA_COLOR
      ctx.lineWidth   = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath(); ctx.moveTo(PAD_L, sy); ctx.lineTo(W - PAD_R, sy); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(91,156,246,0.5)'
      ctx.font = '9px Inter, sans-serif'
      ctx.fillText('200 SMA', PAD_L + 4, sy - 3)
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, PAD_T, 0, H)
    grad.addColorStop(0, fillStart)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(prices[0]))
    for (let i = 1; i < prices.length - 1; i++) {
      const mx = (toX(i) + toX(i + 1)) / 2
      const my = (toY(prices[i]) + toY(prices[i + 1])) / 2
      ctx.quadraticCurveTo(toX(i), toY(prices[i]), mx, my)
    }
    ctx.lineTo(toX(prices.length - 1), toY(prices[prices.length - 1]))
    ctx.lineTo(toX(prices.length - 1), H)
    ctx.lineTo(toX(0), H)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Price line
    ctx.beginPath()
    ctx.moveTo(toX(0), toY(prices[0]))
    for (let i = 1; i < prices.length - 1; i++) {
      const mx = (toX(i) + toX(i + 1)) / 2
      const my = (toY(prices[i]) + toY(prices[i + 1])) / 2
      ctx.quadraticCurveTo(toX(i), toY(prices[i]), mx, my)
    }
    ctx.lineTo(toX(prices.length - 1), toY(prices[prices.length - 1]))
    ctx.strokeStyle = lineColor
    ctx.lineWidth   = 1.8
    ctx.stroke()

    // Hover crosshair
    if (hIdx >= 0 && hIdx < prices.length) {
      const cx = toX(hIdx)
      const cy = toY(prices[hIdx])
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.moveTo(cx, PAD_T); ctx.lineTo(cx, H - PAD_B); ctx.stroke()
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = lineColor; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2)
      ctx.strokeStyle = lineColor + '55'; ctx.lineWidth = 2; ctx.stroke()
    }
  }

  useEffect(() => { draw(hoverIdx) }, [prices, sma200, hoverIdx])

  useEffect(() => {
    const obs = new ResizeObserver(() => draw(hoverIdx))
    if (wrapRef.current) obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [prices, sma200, hoverIdx])

  function onMove(e) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect || !prices.length) return
    const x   = e.clientX - rect.left
    const idx = Math.round((x / rect.width) * (prices.length - 1))
    const clamped = Math.max(0, Math.min(prices.length - 1, idx))
    setHoverIdx(clamped)
    setTipPos({ x, y: 0 })
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minHeight: 0, cursor: 'crosshair' }}
      onMouseMove={onMove} onMouseLeave={() => setHoverIdx(-1)}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {hoverIdx >= 0 && prices[hoverIdx] != null && (
        <div style={{
          position: 'absolute', top: 6,
          left: Math.min(tipPos.x + 10, 220),
          background: 'rgba(8,9,16,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '7px', padding: '5px 10px',
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: '12px', fontWeight: 500,
          color: '#eef2ff', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          ${prices[hoverIdx].toFixed(2)}
        </div>
      )}
    </div>
  )
}
