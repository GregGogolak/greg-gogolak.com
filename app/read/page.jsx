'use client'

import { useState, useEffect } from 'react'

const ACTION_TAB = {
  BUY:   'border-emerald-700 text-emerald-400 bg-emerald-500/10',
  WAIT:  'border-amber-700   text-amber-400   bg-amber-500/10',
  HOLD:  'border-blue-700    text-blue-400    bg-blue-500/10',
  AVOID: 'border-red-700     text-red-400     bg-red-500/10',
}

const ACTION_SECTION = {
  BUY:   'border-l-emerald-600 bg-emerald-500/[0.04] border-emerald-500/20',
  WAIT:  'border-l-amber-600   bg-amber-500/[0.04]   border-amber-500/20',
  HOLD:  'border-l-blue-600    bg-blue-500/[0.04]    border-blue-500/20',
  AVOID: 'border-l-red-600     bg-red-500/[0.04]     border-red-500/20',
}

const ACTION_TEXT = {
  BUY:   'text-emerald-400',
  WAIT:  'text-amber-400',
  HOLD:  'text-blue-400',
  AVOID: 'text-red-400',
}

const UNDERVALUED_STYLE = {
  Yes: { border: 'border-l-emerald-600', text: 'text-emerald-400' },
  No:  { border: 'border-l-red-600',     text: 'text-red-400'     },
}

function tabLabel(read) {
  const action = read.recommendedAction?.action ?? '??'
  const time   = new Date(read.generatedAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return `${action} ${time}`
}

function timeAgo(val) {
  const ms   = val > 1e12 ? val : val * 1000
  const mins = Math.floor((Date.now() - ms) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60)  return `${mins} mins ago`
  return `${Math.floor(mins / 60)}h ago`
}

export default function ReadPage() {
  const [history,   setHistory]   = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [pulseOpen, setPulseOpen] = useState(false)

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setHistory(data)
          setActiveIdx(0)
        }
      })
      .catch(() => {})
  }, [])

  async function handleNewRead() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analysis', { method: 'POST' })
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`)
      const result = await res.json()
      setHistory(prev => [result, ...prev].slice(0, 5))
      setActiveIdx(0)
      setPulseOpen(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(idx) {
    setActiveIdx(idx)
    setPulseOpen(false)
  }

  const data = history[activeIdx] ?? null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#eef2ff] px-4 py-6 pb-24 max-w-[480px] mx-auto">
      <p className="text-[10px] font-mono text-gray-500 tracking-widest mb-4">GIVE ME A READ</p>

      {/* Tab strip */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-1 border-b border-white/[0.03] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {history.map((read, i) => {
          const action = read.recommendedAction?.action
          const isActive = i === activeIdx
          return (
            <button
              key={`${read.generatedAt}-${i}`}
              onClick={() => switchTab(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide border transition-colors ${
                isActive && ACTION_TAB[action]
                  ? ACTION_TAB[action]
                  : 'border-white/5 text-gray-600 hover:border-white/10 hover:text-gray-500'
              }`}
            >
              {tabLabel(read)}
            </button>
          )
        })}
        <button
          onClick={handleNewRead}
          disabled={loading}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide border transition-colors disabled:cursor-not-allowed ${
            loading
              ? 'border-blue-700 text-blue-400 bg-blue-500/10'
              : 'border-white/5 text-gray-600 hover:border-blue-700/50 hover:text-blue-400'
          }`}
        >
          {loading ? 'ANALYSING…' : '+ NEW READ'}
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-xs font-mono text-center my-3">{error}</p>
      )}

      {/* Empty state */}
      {!loading && history.length === 0 && (
        <p className="text-[11px] font-mono text-gray-600 text-center mt-8">
          No reads yet — tap + NEW READ
        </p>
      )}

      {/* Shimmer skeleton — shown while a new read is in flight */}
      {loading && (
        <div className="space-y-2 mt-4">
          {[72, 88, 65, 55].map((w, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/[0.03] border-l-2 border-l-gray-800 bg-white/[0.018] p-4"
            >
              <div
                className="h-2 rounded bg-white/[0.05] animate-pulse mb-3"
                style={{ width: `${w}%` }}
              />
              <div
                className="h-2 rounded bg-white/[0.03] animate-pulse"
                style={{ width: `${w - 18}%` }}
              />
            </div>
          ))}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Cache age */}
          <p className="text-[10px] font-mono text-gray-700 text-center my-3">
            {Date.now() - data.generatedAt < 60_000
              ? 'fresh read'
              : `${new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · ${timeAgo(data.generatedAt)}`}
          </p>

          <div className="space-y-2">

            {/* 1 — Undervalued */}
            {(() => {
              const ans     = data.undervalued?.answer
              const style   = UNDERVALUED_STYLE[ans] ?? UNDERVALUED_STYLE.No
              const border  = style.border
              const ansText = style.text
              return (
                <div className={`rounded-lg border border-white/[0.03] border-l-2 ${border} bg-white/[0.018] p-4`}>
                  <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">UNDERVALUED?</p>
                  <p className={`text-xl font-mono font-bold mb-1 ${ansText}`}>{ans}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{data.undervalued?.reason}</p>
                </div>
              )
            })()}

            {/* 2 — Why at this level */}
            <div className="rounded-lg border border-white/[0.03] border-l-2 border-l-amber-700 bg-white/[0.018] p-4">
              <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">WHY AT THIS LEVEL?</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">{data.whyAtThisLevel}</p>
            </div>

            {/* 3 — What resolves it */}
            <div className="rounded-lg border border-white/[0.03] border-l-2 border-l-blue-700 bg-white/[0.018] p-4">
              <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-2">WHAT RESOLVES IT?</p>
              <ul className="space-y-1.5">
                {(Array.isArray(data.whatResolvesIt) ? data.whatResolvesIt : []).map((item, i) => (
                  <li key={i} className="text-[11px] text-gray-400 flex gap-2">
                    <span className="text-blue-500 font-mono shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* 4 — Recommended action */}
            {(() => {
              const action  = data.recommendedAction?.action
              const section = ACTION_SECTION[action] ?? 'border-l-gray-700 bg-white/[0.018] border-white/[0.03]'
              const text    = ACTION_TEXT[action]    ?? 'text-white'
              return (
                <div className={`rounded-lg border border-l-2 p-4 ${section}`}>
                  <p className="text-[9px] font-mono text-gray-600 tracking-widest mb-1">RECOMMENDED ACTION</p>
                  <p className={`text-2xl font-mono font-bold mb-1 ${text}`}>{action}</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{data.recommendedAction?.reason}</p>
                </div>
              )
            })()}

            {/* 5 — Market Pulse */}
            <button
              onClick={() => setPulseOpen(o => !o)}
              className="w-full rounded-lg border border-white/[0.03] border-l-2 border-l-gray-800 bg-white/[0.018] p-4 text-left hover:bg-white/[0.025] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-mono text-gray-600 tracking-widest">MARKET PULSE</p>
                <span className="text-gray-700 font-mono text-[9px]">{pulseOpen ? '▲' : '▼'}</span>
              </div>

              {!data.marketPulse ? (
                <p className="text-[9px] font-mono text-gray-700">Not available for this read</p>
              ) : !pulseOpen ? (
                <div className="flex gap-2">
                  <div className="flex-1 border border-white/[0.03] rounded-md px-3 py-2">
                    <p className="text-[8px] font-mono text-gray-700 tracking-widest mb-1">RETAIL</p>
                    <p className="text-[10px] text-gray-400">{data.marketPulse?.retail?.label}</p>
                  </div>
                  <div className="flex-1 border border-white/[0.03] rounded-md px-3 py-2">
                    <p className="text-[8px] font-mono text-gray-700 tracking-widest mb-1">HEDGE FUND</p>
                    <p className="text-[10px] text-gray-400">{data.marketPulse?.hedge?.label}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mt-1">
                  <div>
                    <p className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">RETAIL</p>
                    <p className="text-[11px] font-mono text-gray-300 mb-1">{data.marketPulse?.retail?.label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{data.marketPulse?.retail?.summary}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono text-gray-600 tracking-widest mb-1">HEDGE FUND</p>
                    <p className="text-[11px] font-mono text-gray-300 mb-1">{data.marketPulse?.hedge?.label}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed">{data.marketPulse?.hedge?.summary}</p>
                  </div>
                </div>
              )}
            </button>

          </div>
        </>
      )}
    </div>
  )
}
