'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getMarketSession } from '@/lib/sessionUtils'

const NVDALiveContext = createContext({
  livePrice:   null,
  wsConnected: false,
  lastTick:    null,
  isLiveFresh: false,
})

export function useNVDALive() {
  return useContext(NVDALiveContext)
}

const BACKOFF_MAX           = 30_000
const STALE_TIMEOUT         = 30_000 // market hours only
const MAX_RECONNECT_ATTEMPTS = 5
const STALE_TICK_MS         = 60_000

export function NVDALiveContextProvider({ children }) {
  const [livePrice,   setLivePrice]   = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastTick,    setLastTick]    = useState(null)

  const wsRef              = useRef(null)
  const backoffRef         = useRef(1000)
  const reconnectTimer     = useRef(null)
  const staleTimer         = useRef(null)
  const hasLoggedWsError   = useRef(false)
  const reconnectAttempts  = useRef(0)

  // REST fallback — polls /api/price every 60s when WebSocket is not connected.
  // Fires immediately on mount and whenever wsConnected drops to false.
  useEffect(() => {
    if (wsConnected) return
    async function fetchFallback() {
      try {
        const res  = await fetch('/api/price')
        const data = await res.json()
        if (data?.price) setLivePrice(parseFloat(data.price))
      } catch {}
    }
    fetchFallback()
    const id = setInterval(fetchFallback, 60_000)
    return () => clearInterval(id)
  }, [wsConnected])

  function connect() {
    // Don't open a second connection if one is already live
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: 'NVDA' }))
      setWsConnected(true)
      backoffRef.current        = 1000 // reset on successful connection
      reconnectAttempts.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type !== 'trade' || !Array.isArray(msg.data) || msg.data.length === 0) return
        const price = msg.data[msg.data.length - 1].p
        setLivePrice(price)
        setLastTick(Date.now())

        // Stale-connection guard: only active during regular market hours
        if (getMarketSession() === 'open') {
          clearTimeout(staleTimer.current)
          staleTimer.current = setTimeout(() => setWsConnected(false), STALE_TIMEOUT)
        }
      } catch {
        // malformed message — ignore
      }
    }

    ws.onerror = () => {
      if (!hasLoggedWsError.current) {
        console.warn('Finnhub WebSocket unavailable — using REST fallback for price data')
        hasLoggedWsError.current = true
      }
      setWsConnected(false)
    }

    ws.onclose = () => {
      setWsConnected(false)
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++
        // Reconnect with exponential backoff
        reconnectTimer.current = setTimeout(() => {
          backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX)
          connect()
        }, backoffRef.current)
      } else {
        console.warn('Finnhub WebSocket max reconnect attempts reached — relying on REST fallback')
      }
    }
  }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FINNHUB_API_KEY) console.warn('[NVDALive] NEXT_PUBLIC_FINNHUB_API_KEY missing — WS will fail')
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(staleTimer.current)
      if (wsRef.current) {
        // Prevent the onclose handler from scheduling a reconnect on intentional teardown
        wsRef.current.onclose = null
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: 'NVDA' }))
        }
        wsRef.current.close()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isLiveFresh = lastTick !== null && (Date.now() - lastTick) < STALE_TICK_MS

  return (
    <NVDALiveContext.Provider value={{ livePrice, wsConnected, lastTick, isLiveFresh }}>
      {children}
    </NVDALiveContext.Provider>
  )
}
