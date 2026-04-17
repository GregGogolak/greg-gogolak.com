import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
import NavPill, { PageWrapper } from '@/components/UI/NavPill'
import AlertBanner from '@/components/Alerts/AlertBanner'
import { NVDALiveContextProvider } from '@/context/NVDALiveContext'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter-tight' })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0d0d14',
}

export const metadata = {
  title: 'NVDA Jarvis',
  description: 'AI trading co-pilot for NVDA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NVDA Jarvis',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#0d0d14',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider signInUrl="/login" afterSignOutUrl="/login">
      <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
        <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
          <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="NVDA Jarvis" />
          <NVDALiveContextProvider>
            <AlertBanner />
            <NavPill />
            <PageWrapper>{children}</PageWrapper>
          </NVDALiveContextProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
