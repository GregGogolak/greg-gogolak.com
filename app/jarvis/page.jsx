'use client'

import JarvisPanel from '@/components/Jarvis/JarvisPanel'

export default function JarvisPage() {
  return (
    <div style={{
      position: 'fixed',
      inset:    0,
      width:    '100vw',
      height:   '100vh',
      background: '#000000',
      overflow: 'hidden',
    }}>
      <JarvisPanel />
    </div>
  )
}
