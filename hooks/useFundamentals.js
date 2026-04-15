'use client'
/**
 * useFundamentals — fetches /api/fundamentals once on mount.
 *
 * Returns:
 *   data    — { analystTarget, forwardPE, eps, fiftyTwoWeekHigh, fiftyTwoWeekLow, ts }
 *   loading — true until first fetch resolves
 *
 * No polling — the route caches for 6 hours in Redis, so re-fetching
 * on a short interval would just return cached data anyway.
 */
import { useState, useEffect } from 'react'

export function useFundamentals() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fundamentals')
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(e => console.error('[useFundamentals]', e))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
