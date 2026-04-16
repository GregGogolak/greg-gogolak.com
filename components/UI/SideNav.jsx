'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

const adminNav = [
  { href: '/',       label: 'Dashboard', icon: '⬡' },
  { href: '/brief',  label: 'Brief',     icon: '◑' },
  { href: '/read',   label: 'Read',      icon: '◈' },
  { href: '/trade',  label: 'Trade',     icon: '◇' },
  { href: '/alerts', label: 'Alerts',    icon: '◉' },
  { href: '/track',  label: 'Track',     icon: '◫' },
  { href: '/ledger', label: 'Ledger',    icon: '◻' },
]

const memberNav = [
  { href: '/track',  label: 'Track',     icon: '◇' },
  { href: '/ledger', label: 'Ledger',    icon: '◻' },
]

export default function SideNav() {
  const pathname = usePathname()
  const { user } = useUser()
  const role = user?.publicMetadata?.role ?? user?.privateMetadata?.role ?? 'member'
  const navItems = role === 'admin' ? adminNav : memberNav

  const [mobileOpen, setMobileOpen] = useState(false)

  // Close nav when route changes on mobile
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when nav is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  if (pathname === '/login') return null

  return (
    <>
      <style>{`
        .sidenav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          width: calc(100% - 16px);
          padding: 12px 4px;
          border-radius: 14px;
          text-decoration: none;
          color: #4a5568;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .sidenav-item:hover {
          color: #8892a8;
          background: rgba(255,255,255,0.045);
          border-color: rgba(255,255,255,0.06);
        }
        .sidenav-item.active {
          color: #eef2ff;
          background: rgba(91,156,246,0.13);
          border-color: rgba(91,156,246,0.22);
          box-shadow: 0 4px 20px rgba(91,156,246,0.08), inset 0 1px 0 rgba(91,156,246,0.15);
        }
        .sidenav-item.active .sidenav-icon {
          color: #5b9cf6;
          filter: drop-shadow(0 0 6px rgba(91,156,246,0.65));
        }
        .sidenav-item .sidenav-icon {
          font-size: 22px;
          line-height: 1;
          transition: filter 0.2s ease, color 0.2s ease;
        }
        .sidenav-item:hover .sidenav-icon {
          filter: drop-shadow(0 0 5px rgba(91,156,246,0.3));
          color: #7aabf8;
        }
        .sidenav-active-bar {
          position: absolute;
          left: -1px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 28px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #7aabf8, #5b9cf6);
          box-shadow: 0 0 10px rgba(91,156,246,0.9);
        }
        .sidenav-divider {
          width: 32px;
          height: 1px;
          background: rgba(255,255,255,0.06);
          margin: 6px 0;
        }
        @media (max-width: 640px) {
          .sidenav {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            width: 80px;
          }
          .sidenav.sidenav-open {
            transform: translateX(0);
            box-shadow: 4px 0 40px rgba(0,0,0,0.6);
          }
          .hamburger-btn {
            display: flex !important;
          }
          .mobile-nav-backdrop {
            display: block;
          }
        }
        @media (min-width: 641px) {
          .sidenav {
            transform: none !important;
            transition: none;
          }
          .hamburger-btn {
            display: none !important;
          }
        }
      `}</style>

      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          display: 'none',
          position: 'fixed',
          top: '12px',
          left: '14px',
          zIndex: 200,
          background: 'rgba(13,16,25,0.9)',
          border: '0.5px solid #1a1f2e',
          borderRadius: '8px',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '4px',
          padding: '0',
        }}
        className='hamburger-btn'
        aria-label='Open navigation'
      >
        <span style={{width:'16px',height:'1.5px',background:'#7b8cde',borderRadius:'2px',display:'block'}}/>
        <span style={{width:'16px',height:'1.5px',background:'#7b8cde',borderRadius:'2px',display:'block'}}/>
        <span style={{width:'10px',height:'1.5px',background:'#7b8cde',borderRadius:'2px',display:'block'}}/>
      </button>

      {/* Backdrop — mobile only, shown when nav is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 149,
            backdropFilter: 'blur(2px)',
          }}
          className='mobile-nav-backdrop'
        />
      )}

      <nav
        className={`sidenav${mobileOpen ? ' sidenav-open' : ''}`}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: '90px',
          background: 'linear-gradient(180deg, rgba(10,11,20,0.97) 0%, rgba(8,9,16,0.97) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: '24px', paddingBottom: '24px', gap: '4px',
          zIndex: 150,
        }}
      >
        {/* Logo mark */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '11px',
          background: 'linear-gradient(135deg, rgba(91,156,246,0.28) 0%, rgba(91,156,246,0.07) 100%)',
          border: '1px solid rgba(91,156,246,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '17px', color: '#5b9cf6',
          marginBottom: '24px',
          boxShadow: '0 0 20px rgba(91,156,246,0.18), inset 0 1px 0 rgba(91,156,246,0.2)',
        }}>⬡</div>

        {navItems.map(({ href, label, icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`sidenav-item${isActive ? ' active' : ''}`}
            >
              {isActive && <span className="sidenav-active-bar" />}
              <span className="sidenav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
