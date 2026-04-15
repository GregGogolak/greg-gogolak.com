'use client'
/**
 * useNVDAData — polls /api/price every 60s.
 *
 * Returns:
 *   data    — { price, prevClose, pctChange, sma200, sma50, pctFrom200, pctFrom50,
 *               tenDayHigh, pctBelowHigh, thirtyDayAvgVol, volumeRatio, sparkline }
 *   loading — true until first successful fetch
 *   error   — last fetch error message, or null
 *   refresh — call to force an immediate re-fetch
 */
import { useState, useEffect, useRef } from 'react'

// Slightly under the server-side quote TTL (55s) so the client always gets fresh data
const POLL_INTERVAL = 60_000

export function useNVDAData() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const timer = useRef(null)

  async function fetchPrice() {
    try {
      const res = await fetch('/api/price')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrice()
    timer.current = setInterval(fetchPrice, POLL_INTERVAL)
    return () => clearInterval(timer.current)
  }, [])

  return { data, loading, error, refresh: fetchPrice }
}
