import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
import NavPill, { PageWrapper } from '@/components/UI/NavPill'
import AlertBanner from '@/components/Alerts/AlertBanner'
import { NVDALiveContextProvider } from '@/context/NVDALiveContext'
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter-tight' })

export const metadata = {
  title: 'NVDA Jarvis',
  description: 'AI trading co-pilot for NVDA',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider signInUrl="/login" afterSignOutUrl="/login">
      <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
        <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
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
