'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, UserButton } from '@clerk/nextjs'
import { useNVDAData }    from '@/hooks/useNVDAData'
import { useMacroData }   from '@/hooks/useMacroData'
import { useNews }        from '@/hooks/useNews'
import { getThesisStatus } from '@/lib/thesisEngine'
import { getMarketSession } from '@/lib/sessionUtils'

// ── Nav definitions ────────────────────────────────────────────────────────────
const adminNav = [
  { href: '/',       label: 'Dashboard' },
  { href: '/read',   label: 'Read'      },
  { href: '/trade',  label: 'Trade'     },
  { href: '/alerts', label: 'Alerts'    },
  { href: '/track',  label: 'Track'     },
  { href: '/ledger', label: 'Ledger'    },
  { href: '/brief',  label: 'Brief'     },
]

const memberNav = [
  { href: '/track',  label: 'Track'  },
  { href: '/ledger', label: 'Ledger' },
]

// ── Thesis badge config ────────────────────────────────────────────────────────
const THESIS_CFG = {
  'INTACT':   { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  color: '#22c55e' },
  'AT RISK':  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#f59e0b' },
  'BROKEN':   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#ef4444' },
}

// ── PageWrapper ────────────────────────────────────────────────────────────────
// key={pathname} remounts on navigation, triggering pageFadeIn CSS animation.
export function PageWrapper({ children }) {
  const pathname = usePathname()
  return (
    <main
      key={pathname}
      className="page-content"
      style={{ position: 'relative', zIndex: 1, paddingTop: '68px', minHeight: '100vh' }}
    >
      {children}
    </main>
  )
}

// ── NavPill (now a full-width floating header bar) ─────────────────────────────
export default function NavPill() {
  const pathname = usePathname()
  const { user }  = useUser()
  const role      = user?.publicMetadata?.role ?? user?.privateMetadata?.role ?? 'member'
  const navItems  = role === 'admin' ? adminNav : memberNav

  // ── Data for thesis status + LIVE indicator ──────────────────────────────────
  const { data: priceData } = useNVDAData()
  const { data: macroData } = useMacroData()
  const { articles }        = useNews()

  // Market session — pure time function, updated every second
  const [session, setSession] = useState(() => getMarketSession())
  useEffect(() => {
    function tick() { setSession(getMarketSession()) }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // NYSE time — Eastern Time, updates every second
  const [nyseTime, setNyseTime] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      setNyseTime(timeStr)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Thesis — derived from live data
  const price    = priceData?.price        ?? null
  const sma200   = priceData?.sma200       ?? null
  const vix      = macroData?.vix?.level   ?? 0
  const oilTwo   = macroData?.oil?.twoSessionPct ?? 0
  const nowSec   = Date.now() / 1000
  const hasBucketCNews = articles.some(
    a => a.bucket === 'C' && (nowSec - a.datetime) < 86400
  )
  const thesis    = getThesisStatus({ price, sma200, oilTwoSessionPct: oilTwo, vix, hasBucketCNews })
  const thesisCfg = THESIS_CFG[thesis.status]

  // ── Sliding indicator refs ───────────────────────────────────────────────────
  // centreRef goes on the INNER nav zone so indicator.left is relative to it.
  const centreRef      = useRef(null)
  const itemRefs       = useRef({})
  const indicatorRef   = useRef(null)
  const activeLabelRef = useRef(null)

  const activeLabel = (
    navItems.find(item =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    ) ?? navItems[0]
  )?.label

  activeLabelRef.current = activeLabel

  const updateIndicator = () => {
    const label     = activeLabelRef.current
    const container = centreRef.current
    const item      = itemRefs.current[label]
    const indicator = indicatorRef.current
    if (!container || !item || !indicator) return
    const cRect = container.getBoundingClientRect()
    const iRect = item.getBoundingClientRect()
    if (iRect.width === 0) {
      indicator.style.opacity = '0'
      return
    }
    indicator.style.left    = `${iRect.left - cRect.left + container.scrollLeft}px`
    indicator.style.width   = `${iRect.width}px`
    indicator.style.opacity = '1'
  }

  // Slide on active section change
  useEffect(() => {
    updateIndicator()
    const item = itemRefs.current[activeLabel]
    if (item && centreRef.current) {
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeLabel])

  // Mount: snap to position instantly, then enable transition
  useEffect(() => {
    const indicator = indicatorRef.current
    if (indicator) indicator.style.transition = 'none'

    // Double-rAF: first frame commits DOM, second frame measures
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateIndicator()
        if (indicator) {
          indicator.style.transition =
            'left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease'
        }
      })
    })

    const handleResize = () => updateIndicator()
    window.addEventListener('resize', handleResize)
    const centre = centreRef.current
    if (centre) centre.addEventListener('scroll', updateIndicator)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (centre) centre.removeEventListener('scroll', updateIndicator)
      cancelAnimationFrame(raf1)
    }
  }, [navItems.length])

  if (pathname === '/login') return null

  return (
    <>
      <style>{`
        /* ── Nav item ── */
        .navpill-item {
          position: relative;
          padding: 7px 14px;
          border-radius: 9999px;
          font-family: var(--font-inter, 'Inter', sans-serif);
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          z-index: 1;
          white-space: nowrap;
          user-select: none;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.35);
          transition: color 0.15s ease;
          display: block;
        }
        .navpill-item:hover        { color: rgba(255, 255, 255, 0.55); }
        .navpill-item.navpill-active { color: rgba(255, 255, 255, 0.92); }

        /* ── Identity text — hidden on mobile ── */
        .header-identity-text {
          font-family: var(--font-inter, 'Inter', sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: -0.2px;
        }

        /* ── Status cluster — hidden on mobile ── */
        .header-status-cluster {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 639px) {
          .navpill-item             { font-size: 11px; padding: 6px 10px; }
          .header-identity-text     { display: none; }
          .header-status-cluster    { display: none; }
          .navpill-centre           { max-width: calc(100vw - 120px); }
        }

        /* ── Centre nav scroll ── */
        .navpill-centre::-webkit-scrollbar { display: none; }
      `}</style>

      <nav
        aria-label="Main navigation"
        style={{
          position:             'fixed',
          top:                  'max(12px, env(safe-area-inset-top))',
          left:                 '50%',
          transform:            'translateX(-50%)',
          width:                'calc(100% - 48px)',
          maxWidth:             '1400px',
          zIndex:               1000,
          display:              'flex',
          alignItems:           'center',
          justifyContent:       'space-between',
          background:           'rgba(13, 13, 20, 0.85)',
          backdropFilter:       'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border:               '0.5px solid rgba(255, 255, 255, 0.08)',
          borderRadius:         '9999px',
          padding:              '6px 8px 6px 16px',
          boxShadow:            '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >

        {/* ── LEFT: app identity ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            width:          '26px',
            height:         '26px',
            borderRadius:   '7px',
            background:     'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 100%)',
            border:         '0.5px solid rgba(59,130,246,0.3)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(59,130,246,0.8)' }} />
          </div>
          <span className="header-identity-text">
            NVDA <span style={{ color: 'rgba(59,130,246,0.8)', fontWeight: 400 }}>Jarvis</span>
          </span>
        </div>

        {/* ── CENTRE: nav sections + sliding indicator ───────────────────────── */}
        <div
          ref={centreRef}
          className="navpill-centre"
          style={{
            display:                  'flex',
            alignItems:               'center',
            position:                 'relative',
            background:               'rgba(255,255,255,0.03)',
            borderRadius:             '9999px',
            padding:                  '4px 4px',
            gap:                      '2px',
            overflowX:                'auto',
            scrollbarWidth:           'none',
            WebkitOverflowScrolling:  'touch',
          }}
        >
          {/* Sliding indicator — absolutely positioned behind the active label */}
          <div
            ref={indicatorRef}
            aria-hidden="true"
            style={{
              position:     'absolute',
              top:          '4px',
              left:         0,
              width:        0,
              height:       'calc(100% - 8px)',
              borderRadius: '9999px',
              background:   'rgba(59, 130, 246, 0.15)',
              border:       '0.5px solid rgba(59, 130, 246, 0.25)',
              zIndex:       0,
              pointerEvents:'none',
              opacity:      0,
            }}
          />

          {navItems.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                ref={el => { itemRefs.current[label] = el }}
                className={`navpill-item${isActive ? ' navpill-active' : ''}`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* ── RIGHT: status cluster + Clerk bubble ───────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* Status cluster — hidden on mobile via CSS class */}
          <div className="header-status-cluster">
            {/* NYSE time — ambient, always visible in status cluster */}
            <div style={{
              fontFamily:    'JetBrains Mono, monospace',
              fontSize:      '11px',
              fontWeight:    '400',
              color:         'rgba(255,255,255,0.28)',
              letterSpacing: '0.04em',
              flexShrink:    0,
              minWidth:      '72px',
            }}>
              {nyseTime} <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.08em' }}>ET</span>
            </div>

            {/* LIVE dot — market hours only */}
            {session === 'open' && (
              <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '5px',
                fontFamily:    'var(--font-inter, Inter, sans-serif)',
                fontSize:      '11px',
                color:         'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
              }}>
                <div style={{
                  width:        '6px',
                  height:       '6px',
                  borderRadius: '50%',
                  background:   '#22c55e',
                  boxShadow:    '0 0 6px rgba(34,197,94,0.6)',
                  animation:    'pulse 2s ease-in-out infinite',
                }} />
                LIVE
              </div>
            )}

            {/* Thesis badge */}
            {thesisCfg && (
              <div style={{
                fontFamily:    'var(--font-inter, Inter, sans-serif)',
                fontSize:      '11px',
                fontWeight:    500,
                padding:       '4px 10px',
                borderRadius:  '9999px',
                background:    thesisCfg.bg,
                border:        `0.5px solid ${thesisCfg.border}`,
                color:         thesisCfg.color,
                letterSpacing: '0.04em',
              }}>
                {thesis.status}
              </div>
            )}
          </div>

          {/* Clerk UserButton — always visible */}
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <UserButton
              afterSignOutUrl="/login"
              appearance={{ elements: { avatarBox: { width: '30px', height: '30px' } } }}
            />
          </div>
        </div>

      </nav>
    </>
  )
}
