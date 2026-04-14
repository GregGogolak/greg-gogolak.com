'use client'
import { useState, useEffect, useRef } from 'react'

const QUOTE_INTERVAL  = 60_000   // 60 seconds
const CANDLE_INTERVAL = 300_000  // 5 minutes

export function useNVDAData() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const quoteTimer  = useRef(null)

  async function fetchPrice() {
    try {
      const res = await fetch('/api/price')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrice()
    quoteTimer.current = setInterval(fetchPrice, QUOTE_INTERVAL)
    return () => clearInterval(quoteTimer.current)
  }, [])

  return { data, loading, error, refresh: fetchPrice }
}
