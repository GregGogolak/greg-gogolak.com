'use client'

import { useState, useEffect } from 'react'

const ACTION_COLORS = {
  BUY:   'text-emerald-400',
  HOLD:  'text-blue-400',
  WAIT:  'text-yellow-400',
  AVOID: 'text-red-400',
}

function timeAgo(val) {
  // Normalise: if value looks like seconds-epoch (< 1e12), convert to ms
  const ms   = val > 1e12 ? val : val * 1000
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} mins ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function ReadPage() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [pulseOpen, setPulseOpen] = useState(false)

  // Auto-load cached result on mount — no token cost
  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(res => { if (res.fromCache) setData(res) })
      .catch(() => {})
  }, [])

  async function handleRead() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analysis', { method: 'POST' })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#eef2ff] px-4 py-6 pb-24 max-w-[480px] mx-auto">
      <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-4">GIVE ME A READ</p>

      {/* Trigger button */}
      <button
        onClick={handleRead}
        disabled={loading}
        className="w-full py-3 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-400 font-mono text-sm tracking-wider hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
      >
        {loading ? 'ANALYSING...' : 'GIVE ME A READ'}
      </button>

      {/* Cache age indicator */}
      {data?.generatedAt && (
        <p className="text-[11px] font-mono text-gray-600 text-center mb-6">
          {data.fromCache ? `cached — ${timeAgo(data.generatedAt)}` : 'fresh read'}
        </p>
      )}

      {/* Error state */}
      {error && (
        <p className="text-red-400 text-xs font-mono text-center mb-4">{error}</p>
      )}

      {/* Results */}
      {data?.undervalued && (
        <div className="space-y-3">

          {/* 1 — Undervalued */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">UNDERVALUED?</p>
            <p className={`text-xl font-mono font-bold mb-1 ${data.undervalued.answer === 'Yes' ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.undervalued.answer}
            </p>
            <p className="text-sm text-gray-300">{data.undervalued.reason}</p>
          </div>

          {/* 2 — Why at this level */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">WHY AT THIS LEVEL?</p>
            <p className="text-sm text-gray-300">{data.whyAtThisLevel}</p>
          </div>

          {/* 3 — What resolves it */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-2">WHAT RESOLVES IT?</p>
            <ul className="space-y-1">
              {(Array.isArray(data.whatResolvesIt) ? data.whatResolvesIt : []).map((item, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-blue-400 font-mono shrink-0">›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 4 — Recommended action */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-1">RECOMMENDED ACTION</p>
            <p className={`text-2xl font-mono font-bold mb-1 ${ACTION_COLORS[data.recommendedAction?.action] ?? 'text-white'}`}>
              {data.recommendedAction?.action}
            </p>
            <p className="text-sm text-gray-300">{data.recommendedAction?.reason}</p>
          </div>

          {/* Market Pulse — tappable popup */}
          <button
            onClick={() => setPulseOpen(o => !o)}
            className="w-full rounded-lg border border-white/5 bg-white/[0.03] p-4 text-left hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-mono text-gray-500 tracking-widest">MARKET PULSE</p>
              <span className="text-gray-600 font-mono text-xs">{pulseOpen ? '▲' : '▼'}</span>
            </div>

            {!pulseOpen ? (
              <div className="flex gap-4">
                <span className="text-xs font-mono text-gray-400">
                  🧑 <span className="text-white">{data.marketPulse?.retail?.label}</span>
                </span>
                <span className="text-xs font-mono text-gray-400">
                  🏦 <span className="text-white">{data.marketPulse?.hedge?.label}</span>
                </span>
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                <div>
                  <p className="text-[10px] font-mono text-gray-500 mb-0.5">🧑 RETAIL</p>
                  <p className="text-sm font-mono text-white mb-0.5">{data.marketPulse?.retail?.label}</p>
                  <p className="text-xs text-gray-400">{data.marketPulse?.retail?.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-500 mb-0.5">🏦 HEDGE FUND</p>
                  <p className="text-sm font-mono text-white mb-0.5">{data.marketPulse?.hedge?.label}</p>
                  <p className="text-xs text-gray-400">{data.marketPulse?.hedge?.summary}</p>
                </div>
              </div>
            )}
          </button>

        </div>
      )}
    </div>
  )
}
