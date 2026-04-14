'use client'
import { useState, useEffect, useRef } from 'react'

const INTERVAL = 300_000  // 5 minutes

export function useMacroData() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef(null)

  async function fetchMacro() {
    try {
      const res  = await fetch('/api/macro')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('[useMacroData]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMacro()
    timer.current = setInterval(fetchMacro, INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return { data, loading }
}
