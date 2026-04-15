'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getMarketSession } from '@/lib/sessionUtils'

const NVDALiveContext = createContext({
  livePrice:   null,
  wsConnected: false,
  lastTick:    null,
})

export function useNVDALive() {
  return useContext(NVDALiveContext)
}

const BACKOFF_MAX    = 30_000
const STALE_TIMEOUT  = 30_000 // market hours only

export function NVDALiveContextProvider({ children }) {
  const [livePrice,   setLivePrice]   = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastTick,    setLastTick]    = useState(null)

  const wsRef          = useRef(null)
  const backoffRef     = useRef(1000)
  const reconnectTimer = useRef(null)
  const staleTimer     = useRef(null)

  function connect() {
    // Don't open a second connection if one is already live
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const url = `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`
    const ws  = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: 'NVDA' }))
      setWsConnected(true)
      backoffRef.current = 1000 // reset on successful connection
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
      setWsConnected(false)
    }

    ws.onclose = () => {
      setWsConnected(false)
      // Reconnect with exponential backoff
      reconnectTimer.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX)
        connect()
      }, backoffRef.current)
    }
  }

  useEffect(() => {
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

  return (
    <NVDALiveContext.Provider value={{ livePrice, wsConnected, lastTick }}>
      {children}
    </NVDALiveContext.Provider>
  )
}
