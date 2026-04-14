'use client'

import { useState, useEffect } from 'react'

const ACTION_TAB = {
  BUY:   'border-emerald-700 text-emerald-400 bg-emerald-500/10',
  WAIT:  'border-amber-700   text-amber-400   bg-amber-500/10',
  HOLD:  'border-blue-700    text-blue-400    bg-blue-500/10',
  AVOID: 'border-red-700     text-red-400     bg-red-500/10',
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

      {/* Output sections placeholder — replaced in Task 4 */}
      {data && !loading && (
        <p className="text-gray-600 text-xs font-mono text-center mt-6">sections coming…</p>
      )}
    </div>
  )
}
