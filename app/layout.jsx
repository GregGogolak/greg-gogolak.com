import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
import SideNav from '@/components/UI/SideNav'
import AlertBanner from '@/components/Alerts/AlertBanner'
import { NVDALiveContextProvider } from '@/context/NVDALiveContext'
import { ClerkProvider, UserButton } from '@clerk/nextjs'

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
        <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', display: 'flex' }}>
          <NVDALiveContextProvider>
            <AlertBanner />
            <SideNav />
            <div className='main-content' style={{ position: 'relative', zIndex: 1, flex: 1 }}>
              <div style={{ position: 'fixed', top: '12px', right: '16px', zIndex: 100 }} className='user-button-wrap'>
                <UserButton />
              </div>
              {children}
            </div>
          </NVDALiveContextProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
