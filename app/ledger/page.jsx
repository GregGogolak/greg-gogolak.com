'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fmtEUR } from '@/lib/format'

// ─── useCountUp ───────────────────────────────────────────────────────────────
// Animates a numeric value from 0 → target using easeOutExpo.
function useCountUp(target, duration = 1400, delay = 0) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(target) || target === 0) return
    let raf
    const timer = setTimeout(() => {
      const t0 = performance.now()
      const step = (now) => {
        const elapsed = now - t0
        const progress = Math.min(elapsed / duration, 1)
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setVal(target * eased)
        if (progress < 1) raf = requestAnimationFrame(step)
        else setVal(target)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [target, duration, delay])

  return val
}

// ─── Counted display helpers ──────────────────────────────────────────────────
function CountedEUR({ value, delay = 0, duration = 1400 }) {
  const counted = useCountUp(value ?? 0, duration, delay)
  const abs = Math.abs(counted)
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return <>{value < 0 ? '-€' : '€'}{str}</>
}

function CountedPct({ value, delay = 0, duration = 900 }) {
  const counted = useCountUp(value ?? 0, duration, delay)
  return <>{Math.round(counted)}%</>
}

function CountedInt({ value, delay = 0, duration = 800 }) {
  const counted = useCountUp(value ?? 0, duration, delay)
  return <>{Math.round(counted)}</>
}

// ─── Animation variants ───────────────────────────────────────────────────────
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1]

const leaderContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
const memberContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.0 } },
}
const cardItem = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE_OUT_EXPO } },
}

// ─── LeaderCard ───────────────────────────────────────────────────────────────
function LeaderCard({ title, icon, value, valueColor, winners, runners = [], className = '' }) {
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className={`relative rounded-xl overflow-hidden cursor-default ${className}`}
      style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.065)',
      }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: 'linear-gradient(to bottom, #5b9cf6 0%, rgba(91,156,246,0.08) 100%)' }}
      />

      <div className="p-3 pl-[14px]">
        {/* Category + icon */}
        <div className="flex justify-between items-start mb-2">
          <div className="font-mono text-[8px] text-[#3d4a5c] tracking-[0.12em] uppercase leading-tight">
            {title}
          </div>
          <span className="text-[12px] opacity-40 ml-2">{icon}</span>
        </div>

        {/* Winner value */}
        <div className="font-mono text-[18px] font-medium leading-none mb-1.5" style={{ color: valueColor }}>
          {value}
        </div>

        {/* Winner name(s) */}
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {winners.map((name, i) => (
            <span key={i} className="font-mono text-[10px] text-[#5b9cf6]">
              {name}{winners.length > 1 && i < winners.length - 1 ? ' ·' : ''}
            </span>
          ))}
          {winners.length > 1 && (
            <span className="font-mono text-[8px] text-[#3d4a5c] ml-0.5">TIED</span>
          )}
        </div>

        {/* Runner-up list */}
        {runners.length > 0 && (
          <div
            className="pt-2 space-y-1.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
          >
            {runners.map((runner, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="font-mono text-[8px] text-[#3d4a5c] rounded shrink-0 px-1 py-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    #{i + 2}
                  </span>
                  <span className="font-mono text-[10px] text-[#8892a8] truncate">{runner.name}</span>
                </div>
                <span className="font-mono text-[10px] text-[#8892a8] shrink-0">{runner.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── MemberCard ───────────────────────────────────────────────────────────────
function MemberCard({ member, rank, leaderboard, isExpanded, onToggle }) {
  const trades = member.allTrades ?? member.recentTrades
  const isWinningThisMonth =
    leaderboard?.bestThisMonth?.some(m => m.userId === member.userId) &&
    member.thisMonthNet > 0

  return (
    <motion.div
      variants={cardItem}
      className="rounded-xl mb-3 overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.065)',
      }}
      whileHover={{
        borderColor: 'rgba(91,156,246,0.22)',
        transition: { duration: 0.15 },
      }}
    >
      <div className="relative p-4">
        {/* Watermark rank — large, behind content */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold leading-none pointer-events-none select-none"
          style={{ fontSize: '72px', color: 'rgba(238,242,255,0.025)' }}
          aria-hidden="true"
        >
          {rank}
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-start gap-3 min-w-0">
            {/* Rank badge */}
            <div
              className="mt-0.5 font-mono text-[11px] text-[#3d4a5c] rounded-md px-2 py-1 min-w-[30px] text-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              #{rank}
            </div>

            {/* Name + badges + sub-stats */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-sm font-medium text-[#eef2ff] font-tight">{member.name}</span>
                {member.winStreak >= 2 && (
                  <span
                    className="font-mono text-[9px] rounded px-1.5 py-0.5 border shrink-0"
                    style={{
                      color: '#fbbf24',
                      background: 'rgba(251,191,36,0.08)',
                      borderColor: 'rgba(251,191,36,0.2)',
                    }}
                  >
                    🔥 {member.winStreak}
                  </span>
                )}
                {isWinningThisMonth && (
                  <span
                    className="font-mono text-[9px] rounded px-1.5 py-0.5 border shrink-0"
                    style={{
                      color: '#34d399',
                      background: 'rgba(52,211,153,0.08)',
                      borderColor: 'rgba(52,211,153,0.2)',
                    }}
                  >
                    👑 WINNING
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] text-[#3d4a5c]">
                {member.tradeCount} trades
                {member.winRate !== null ? ` · ${member.winRate}% win` : ''}
              </div>
              <div
                className="font-mono text-[10px]"
                style={{ color: member.thisMonthNet >= 0 ? '#34d399' : '#f87171' }}
              >
                {member.thisMonthNet >= 0 ? '+' : ''}
                {fmtEUR(member.thisMonthNet)} this month
              </div>
            </div>
          </div>

          {/* Total net P&L */}
          <div className="text-right ml-3 shrink-0">
            <div
              className="font-mono text-sm font-medium"
              style={{ color: member.totalNetEur >= 0 ? '#34d399' : '#f87171' }}
            >
              {fmtEUR(member.totalNetEur)}
            </div>
            <div className="font-mono text-[9px] text-[#3d4a5c]">total net</div>
          </div>
        </div>

        {/* Open positions */}
        {member.openPositions.length > 0 && (
          <div className="mt-3 relative z-10">
            <div className="font-mono text-[9px] text-[#3d4a5c] uppercase tracking-[0.1em] mb-1.5">
              OPEN NOW
            </div>
            {member.openPositions.map((pos, j) => (
              <div
                key={j}
                className="flex gap-3 items-center py-1.5 font-mono text-xs"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <span className="text-[#5b9cf6]">{pos.type}</span>
                <span className="text-[#8892a8]">{pos.shares} sh @ ${pos.entryPrice}</span>
                <span className="text-[#3d4a5c]">
                  {Math.floor((Date.now() - new Date(pos.entryDate)) / 86400000)}d held
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expand / collapse toggle */}
        {member.tradeCount > 0 && (
          <button
            onClick={onToggle}
            className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-[#3d4a5c] hover:text-[#8892a8] transition-colors duration-150 relative z-10 cursor-pointer"
          >
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="inline-block leading-none"
            >
              ▼
            </motion.span>
            {isExpanded
              ? 'hide trades'
              : `show all trades (${member.tradeCount})`}
          </button>
        )}
      </div>

      {/* Inline trade history — animated open/close */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="history"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }}>
              {/* Horizontal scroll wrapper for mobile */}
              <div className="overflow-x-auto no-scrollbar">
                <div className="px-4 pt-3 pb-4" style={{ minWidth: '400px' }}>
                  {/* Header row */}
                  <div
                    className="grid gap-1 pb-2 mb-1 font-mono text-[8px] text-[#3d4a5c] uppercase tracking-[0.1em]"
                    style={{
                      gridTemplateColumns: '78px 58px 38px 64px 64px 1fr',
                      borderBottom: '1px solid rgba(255,255,255,0.065)',
                    }}
                  >
                    <span>DATE</span>
                    <span>TYPE</span>
                    <span className="text-right">SH</span>
                    <span className="text-right">ENTRY</span>
                    <span className="text-right">EXIT</span>
                    <span className="text-right">NET EUR</span>
                  </div>

                  {/* Trade rows — staggered */}
                  {trades.map((trade, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: j * 0.015, duration: 0.18, ease: 'easeOut' }}
                      className="grid gap-1 py-1.5 font-mono text-[11px] pl-2"
                      style={{
                        gridTemplateColumns: '78px 58px 38px 64px 64px 1fr',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderLeft: `2px solid ${trade.net_eur >= 0 ? '#34d399' : '#f87171'}`,
                      }}
                    >
                      <span className="text-[#3d4a5c]">{trade.sell_date}</span>
                      <span className="text-[#5b9cf6]">{trade.type}</span>
                      <span className="text-[#8892a8] text-right">{trade.shares}</span>
                      <span className="text-[#8892a8] text-right">${trade.buy_price}</span>
                      <span className="text-[#8892a8] text-right">${trade.sell_price}</span>
                      <span
                        className="text-right font-medium"
                        style={{ color: trade.net_eur >= 0 ? '#34d399' : '#f87171' }}
                      >
                        {fmtEUR(trade.net_eur)}
                      </span>
                    </motion.div>
                  ))}

                  {/* Summary footer */}
                  <div
                    className="flex justify-between mt-3 pt-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.065)' }}
                  >
                    <span className="font-mono text-[9px] text-[#3d4a5c]">
                      {member.tradeCount} trades · {member.winRate}% win rate
                    </span>
                    <span
                      className="font-mono text-[11px] font-medium"
                      style={{ color: member.totalNetEur >= 0 ? '#34d399' : '#f87171' }}
                    >
                      {fmtEUR(member.totalNetEur)} total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── LedgerPage ───────────────────────────────────────────────────────────────
export default function LedgerPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/ledger')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen px-4 pt-6 pb-24 max-w-[480px] mx-auto">
      <p className="font-mono text-[10px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-6">LEDGER</p>
      <div className="space-y-3">
        <div
          className="h-44 rounded-xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.028)' }}
        />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="h-28 rounded-xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.028)', animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen px-4 pt-6 pb-24 max-w-[480px] mx-auto">
      <p className="font-mono text-[10px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-6">LEDGER</p>
      <p className="font-mono text-xs text-[#f87171]">{error}</p>
    </div>
  )

  const members = data?.members ?? []
  const fundStats = data?.fundStats ?? {}

  // ── Leaderboard — computed client-side (same logic as before) ──────────────
  const leaderboard = members.length > 0 ? {
    mostProfitable: (() => {
      const top = Math.max(...members.map(m => m.totalNetEur))
      return members.filter(m => m.totalNetEur === top)
    })(),
    bestWinRate: (() => {
      const qualified = members.filter(m => m.tradeCount >= 3)
      if (qualified.length === 0) return []
      const top = Math.max(...qualified.map(m => m.winRate))
      return qualified.filter(m => m.winRate === top)
    })(),
    bestSingleTrade: (() => {
      const withTrades = members.filter(m => m.bestTrade)
      if (withTrades.length === 0) return []
      const top = Math.max(...withTrades.map(m => m.bestTrade.net_eur))
      return withTrades.filter(m => m.bestTrade.net_eur === top)
    })(),
    mostActive: (() => {
      const top = Math.max(...members.map(m => m.tradeCount))
      return members.filter(m => m.tradeCount === top)
    })(),
    bestThisMonth: (() => {
      const top = Math.max(...members.map(m => m.thisMonthNet))
      return members.filter(m => m.thisMonthNet === top)
    })(),
  } : null

  const totalIsPositive = (fundStats.totalNetEur ?? 0) >= 0

  return (
    <div className="min-h-screen pt-6 pb-24 max-w-[480px] mx-auto">

      {/* ── Page label ── */}
      <p className="font-mono text-[10px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-5 px-4">
        LEDGER
      </p>

      {/* ── Fund Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        className="mx-4 mb-5 rounded-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(91,156,246,${totalIsPositive ? '0.07' : '0.02'}) 0%, rgba(8,9,16,1) 55%)`,
          border: '1px solid rgba(255,255,255,0.065)',
        }}
      >
        <div className="p-5">
          {/* Label */}
          <div className="font-mono text-[9px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-5">
            FUND OVERVIEW
          </div>

          {/* Hero counter — largest text on the page */}
          <div className="mb-5">
            <div className="font-mono text-[9px] text-[#3d4a5c] uppercase tracking-[0.1em] mb-2">
              TOTAL NET P&amp;L
            </div>
            <div
              className="font-mono text-[44px] font-medium leading-none tabular-nums"
              style={{ color: totalIsPositive ? '#34d399' : '#f87171' }}
            >
              <CountedEUR value={fundStats.totalNetEur ?? 0} delay={200} duration={1400} />
            </div>
          </div>

          {/* 3-stat grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="font-mono text-[8px] text-[#3d4a5c] uppercase tracking-[0.1em] mb-1.5">
                TRADES
              </div>
              <div className="font-mono text-[18px] font-medium text-[#eef2ff]">
                <CountedInt value={fundStats.totalTrades ?? 0} delay={320} duration={800} />
              </div>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="font-mono text-[8px] text-[#3d4a5c] uppercase tracking-[0.1em] mb-1.5">
                WIN RATE
              </div>
              <div className="font-mono text-[18px] font-medium text-[#eef2ff]">
                {fundStats.fundWinRate != null
                  ? <CountedPct value={fundStats.fundWinRate} delay={370} duration={900} />
                  : '—'}
              </div>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="font-mono text-[8px] text-[#3d4a5c] uppercase tracking-[0.1em] mb-1.5">
                OPEN POS
              </div>
              <div className="font-mono text-[18px] font-medium text-[#eef2ff]">
                <CountedInt value={fundStats.totalOpenPositions ?? 0} delay={420} duration={600} />
              </div>
            </div>
          </div>

          {/* Best trade ever banner */}
          {fundStats.bestTradeEver && (
            <div
              className="rounded-lg px-3 py-2.5 flex items-center flex-wrap gap-1"
              style={{
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.16)',
              }}
            >
              <span className="font-mono text-[9px] text-[#fbbf24] tracking-[0.12em]">
                ★ BEST TRADE EVER
              </span>
              <span className="font-mono text-[12px] text-[#eef2ff] ml-2">
                {fundStats.bestTradeEver.memberName} — {fmtEUR(fundStats.bestTradeEver.net_eur)}
              </span>
              <span className="font-mono text-[10px] text-[#8892a8] ml-1">
                {fundStats.bestTradeEver.shares}sh @ ${fundStats.bestTradeEver.buy_price} → ${fundStats.bestTradeEver.sell_price}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Leaderboard ── */}
      {leaderboard && (
        <div className="px-4 mb-5">
          <div className="font-mono text-[9px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-3">
            LEADERBOARD
          </div>

          <motion.div
            variants={leaderContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-2"
          >
            <LeaderCard
              title="MOST PROFITABLE"
              icon="💰"
              winners={leaderboard.mostProfitable.map(m => m.name)}
              value={fmtEUR(leaderboard.mostProfitable[0]?.totalNetEur)}
              valueColor={leaderboard.mostProfitable[0]?.totalNetEur >= 0 ? '#34d399' : '#f87171'}
              runners={[...members]
                .sort((a, b) => b.totalNetEur - a.totalNetEur)
                .filter(m => !leaderboard.mostProfitable.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.totalNetEur) }))}
            />

            <LeaderCard
              title="BEST WIN RATE"
              icon="🎯"
              winners={
                leaderboard.bestWinRate.length > 0
                  ? leaderboard.bestWinRate.map(m => m.name)
                  : ['min 3 trades']
              }
              value={
                leaderboard.bestWinRate.length > 0
                  ? `${leaderboard.bestWinRate[0].winRate}%`
                  : '—'
              }
              valueColor="#5b9cf6"
              runners={[...members]
                .filter(m => m.tradeCount >= 3)
                .sort((a, b) => b.winRate - a.winRate)
                .filter(m => !leaderboard.bestWinRate.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: `${m.winRate}%` }))}
            />

            <LeaderCard
              title="BEST SINGLE TRADE"
              icon="⚡"
              winners={
                leaderboard.bestSingleTrade.length > 0
                  ? leaderboard.bestSingleTrade.map(m => m.name)
                  : ['—']
              }
              value={
                leaderboard.bestSingleTrade.length > 0
                  ? fmtEUR(leaderboard.bestSingleTrade[0].bestTrade.net_eur)
                  : '—'
              }
              valueColor="#fbbf24"
              runners={[...members]
                .filter(m => m.bestTrade)
                .sort((a, b) => b.bestTrade.net_eur - a.bestTrade.net_eur)
                .filter(m => !leaderboard.bestSingleTrade.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.bestTrade.net_eur) }))}
            />

            <LeaderCard
              title="MOST ACTIVE"
              icon="🔥"
              winners={leaderboard.mostActive.map(m => m.name)}
              value={`${leaderboard.mostActive[0]?.tradeCount} trades`}
              valueColor="#eef2ff"
              runners={[...members]
                .sort((a, b) => b.tradeCount - a.tradeCount)
                .filter(m => !leaderboard.mostActive.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: `${m.tradeCount} trades` }))}
            />

            {/* BEST THIS MONTH — full width */}
            <LeaderCard
              className="col-span-2"
              title="BEST THIS MONTH"
              icon="📅"
              winners={leaderboard.bestThisMonth.map(m => m.name)}
              value={fmtEUR(leaderboard.bestThisMonth[0]?.thisMonthNet)}
              valueColor={
                leaderboard.bestThisMonth[0]?.thisMonthNet >= 0 ? '#34d399' : '#f87171'
              }
              runners={[...members]
                .sort((a, b) => b.thisMonthNet - a.thisMonthNet)
                .filter(m => !leaderboard.bestThisMonth.find(w => w.userId === m.userId))
                .slice(0, 4)
                .map(m => ({ name: m.name, value: fmtEUR(m.thisMonthNet) }))}
            />
          </motion.div>
        </div>
      )}

      {/* ── Member cards ── */}
      <div className="px-4">
        {members.length > 0 && (
          <div className="font-mono text-[9px] text-[#3d4a5c] tracking-[0.15em] uppercase mb-3">
            MEMBERS
          </div>
        )}

        <motion.div
          variants={memberContainer}
          initial="hidden"
          animate="show"
        >
          {members.map((member, i) => (
            <MemberCard
              key={member.userId}
              member={member}
              rank={i + 1}
              leaderboard={leaderboard}
              isExpanded={expanded === member.userId}
              onToggle={() =>
                setExpanded(expanded === member.userId ? null : member.userId)
              }
            />
          ))}
        </motion.div>

        {members.length === 0 && (
          <p className="font-mono text-xs text-[#3d4a5c]">No members yet.</p>
        )}
      </div>
    </div>
  )
}
