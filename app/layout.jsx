import { Inter, Inter_Tight } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import AlertBanner from '@/components/Alerts/AlertBanner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter-tight' })

export const metadata = {
  title: 'NVDA Jarvis',
  description: 'AI trading co-pilot for NVDA',
}

const NAV = [
  { href: '/',        label: 'Dashboard', icon: '⬡' },
  { href: '/read',    label: 'Read',      icon: '◈' },
  { href: '/trade',   label: 'Trade',     icon: '◇' },
  { href: '/alerts',  label: 'Alerts',    icon: '◉' },
]

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', paddingBottom: '52px' }}>
        <AlertBanner />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>

        {/* Bottom nav */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '52px',
          background: 'rgba(8,9,16,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.065)',
          display: 'flex', alignItems: 'center',
          zIndex: 100,
        }}>
          {NAV.map(({ href, label, icon }) => (
            <Link key={href} href={href} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px', padding: '8px 0',
              textDecoration: 'none', color: '#3d4a5c',
              fontSize: '10px', fontWeight: 500, letterSpacing: '0.03em',
            }}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </body>
    </html>
  )
}
