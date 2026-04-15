import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'
import SideNav from '@/components/UI/SideNav'
import { NVDALiveContextProvider } from '@/context/NVDALiveContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-inter-tight' })

export const metadata = {
  title: 'NVDA Jarvis',
  description: 'AI trading co-pilot for NVDA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', display: 'flex' }}>
        <NVDALiveContextProvider>
          <SideNav />
          <div style={{ position: 'relative', zIndex: 1, flex: 1, marginLeft: '90px' }}>
            {children}
          </div>
        </NVDALiveContextProvider>
      </body>
    </html>
  )
}
