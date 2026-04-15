'use client'
/**
 * useMacroData — polls /api/macro every 5 minutes.
 *
 * Returns:
 *   data    — { oil: { price, pctChange, twoSessionPct }, qqq: { pctChange }, vix: { level } }
 *   loading — true until first successful fetch
 */
import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL = 5 * 60_000  // matches server-side MACRO_TTL

export function useMacroData() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef(null)

  async function fetchMacro() {
    try {
      setData(await fetch('/api/macro').then(r => r.json()))
    } catch (e) {
      console.error('[useMacroData]', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMacro()
    timer.current = setInterval(fetchMacro, POLL_INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return { data, loading }
}
