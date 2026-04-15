'use client'
import { useState, useEffect, useRef } from 'react'
import { daysUntil } from '@/lib/calculations'
import { EARNINGS_DATE, CONFIG_DEFAULTS } from '@/lib/config'
import {
  checkPriceDropAlert,
  checkCustomLevelAlerts,
  checkInterestErosionAlerts,
  checkOilMoveAlert,
  checkEarningsAlert,
} from '@/lib/alertEngine'

const DISMISSED_KEY  = 'dismissed-alerts'
const BUFFER_MAX     = 120 // 2hrs at 60s intervals

function loadDismissed() {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveDismissed(set) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
  } catch {}
}

/**
 * useAlerts — evaluates all alert conditions and manages alert state.
 *
 * @param {object} [opts]
 * @param {object} [opts.externalPriceData] - price data from useNVDAData (skips internal poll)
 * @param {object} [opts.externalMacroData] - macro data from useMacroData (skips internal poll)
 *
 * When external data is provided (e.g. on the Dashboard where useNVDAData is
 * already running), the hook skips its own polling loops to avoid duplicate
 * requests. The price buffer is still maintained from external data changes.
 * When no external data is provided (e.g. AlertBanner on non-dashboard pages),
 * the hook polls independently as before.
 */
export function useAlerts({ externalPriceData, externalMacroData } = {}) {
  const [internalPriceData, setInternalPriceData] = useState(null)
  const [internalMacroData, setInternalMacroData] = useState(null)
  const [positions,    setPositions]    = useState([])
  const [config,       setConfigState]  = useState(CONFIG_DEFAULTS)
  const [customLevels, setCustomLevels] = useState([])
  const [dismissed,    setDismissed]    = useState(() => loadDismissed())
  const [alerts,       setAlerts]       = useState([])
  const [configLoaded, setConfigLoaded] = useState(false)

  const priceBuffer = useRef([])

  // Resolved data: prefer external, fall back to internal
  const priceData = externalPriceData ?? internalPriceData
  const macroData = externalMacroData ?? internalMacroData

  // ── Price: poll independently only when no external source ───────────────
  useEffect(() => {
    if (externalPriceData !== undefined) return // external caller owns this

    async function fetchPrice() {
      try {
        const data = await fetch('/api/price').then(r => r.json())
        setInternalPriceData(data)
        if (data?.price) {
          priceBuffer.current = [
            ...priceBuffer.current,
            { price: data.price, ts: Date.now() },
          ].slice(-BUFFER_MAX)
        }
      } catch {}
    }
    fetchPrice()
    const id = setInterval(fetchPrice, 60_000)
    return () => clearInterval(id)
  }, [externalPriceData])

  // ── Buffer: feed from external price data when provided ──────────────────
  const prevExternalPrice = useRef(null)
  useEffect(() => {
    if (externalPriceData === undefined) return
    const p = externalPriceData?.price
    if (!p || p === prevExternalPrice.current) return
    prevExternalPrice.current = p
    priceBuffer.current = [
      ...priceBuffer.current,
      { price: p, ts: Date.now() },
    ].slice(-BUFFER_MAX)
  }, [externalPriceData])

  // ── Macro: poll independently only when no external source ──────────────
  useEffect(() => {
    if (externalMacroData !== undefined) return // external caller owns this

    async function fetchMacro() {
      try {
        const data = await fetch('/api/macro').then(r => r.json())
        setInternalMacroData(data)
      } catch {}
    }
    fetchMacro()
    const id = setInterval(fetchMacro, 5 * 60_000)
    return () => clearInterval(id)
  }, [externalMacroData])

  // ── Fetch positions every 5min ────────────────────────────────────────────
  useEffect(() => {
    async function fetchPositions() {
      try {
        const data = await fetch('/api/positions').then(r => r.json()).catch(() => ({ positions: [] }))
        const list = Array.isArray(data.positions) ? data.positions : []
        setPositions(list)
      } catch {}
    }
    fetchPositions()
    const id = setInterval(fetchPositions, 5 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Load config + custom levels on mount ──────────────────────────────────
  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await fetch('/api/alerts').then(r => r.json())
        if (data?.config)       setConfigState({ ...CONFIG_DEFAULTS, ...data.config })
        if (Array.isArray(data?.customLevels)) setCustomLevels(data.customLevels)
        setConfigLoaded(true)
      } catch {
        setConfigLoaded(true) // use defaults on error
      }
    }
    fetchConfig()
  }, [])

  // ── Evaluate alerts whenever data changes ─────────────────────────────────
  useEffect(() => {
    if (!configLoaded) return

    const triggered = []

    if (config.priceDrop) {
      const a = checkPriceDropAlert(priceData, priceBuffer.current)
      if (a) triggered.push(a)
    }

    // Custom levels always checked (each level was intentionally set by user)
    const customAlerts = checkCustomLevelAlerts(priceData?.price, customLevels)
    triggered.push(...customAlerts)

    if (config.interestErosion) {
      const erosion = checkInterestErosionAlerts(positions, priceData?.price)
      triggered.push(...erosion)
    }

    if (config.oilMove) {
      const a = checkOilMoveAlert(macroData)
      if (a) triggered.push(a)
    }

    const days         = daysUntil(EARNINGS_DATE)
    const earningsAlert = checkEarningsAlert(days)
    if (earningsAlert) {
      if (earningsAlert.type === 'EARNINGS_14D' && config.earnings14d) triggered.push(earningsAlert)
      if (earningsAlert.type === 'EARNINGS_3D'  && config.earnings3d)  triggered.push(earningsAlert)
    }

    // Filter out dismissed
    const active = triggered.filter(a => !dismissed.has(a.id))
    setAlerts(active)
  }, [priceData, macroData, positions, config, customLevels, dismissed, configLoaded])

  // ── Actions ───────────────────────────────────────────────────────────────
  function dismissAlert(id) {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      saveDismissed(next)
      return next
    })
  }

  async function setConfig(newConfig) {
    setConfigState(newConfig) // optimistic
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setConfig', payload: newConfig }),
      })
    } catch {}
  }

  async function addCustomLevel(level) {
    try {
      const res  = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addLevel', payload: level }),
      })
      const data = await res.json()
      if (data?.level) setCustomLevels(prev => [...prev, data.level])
    } catch {}
  }

  async function removeCustomLevel(id) {
    setCustomLevels(prev => prev.filter(l => l.id !== id)) // optimistic
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeLevel', payload: { id } }),
      })
    } catch {}
  }

  return {
    alerts,
    dismissAlert,
    config,
    setConfig,
    configLoaded,
    customLevels,
    addCustomLevel,
    removeCustomLevel,
    priceData,
  }
}
