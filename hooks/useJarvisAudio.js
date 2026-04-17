'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * useJarvisAudio — procedurally generated ambient cues for the Jarvis HUD.
 *
 * No external audio files. All sounds synthesised via Web Audio API:
 *   • hum       — two detuned sine oscillators (60Hz, 60.3Hz) through a 200Hz
 *                 lowpass, gain 0.04, automatic start/stop with isCallActive
 *   • ignite    — 0.8s sine+triangle sweep 200→1200Hz with filter sweep
 *   • terminate — 0.4s sine 800→100Hz descending tone
 *
 * All gains capped at 0.08 — subtle, not announcing itself.
 */
export default function useJarvisAudio(isCallActive, status) {
  const ctxRef        = useRef(null)
  const masterRef     = useRef(null)
  const humRef        = useRef(null)       // { osc1, osc2, gain, filter }
  const activeNodesRef = useRef([])         // transient nodes for cleanup

  const ensureCtx = useCallback(() => {
    if (typeof window === 'undefined') return null
    if (ctxRef.current) return ctxRef.current
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
    ctxRef.current    = ctx
    masterRef.current = master
    return ctx
  }, [])

  const resumeIfNeeded = useCallback(async () => {
    const ctx = ctxRef.current
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch { /* ignore */ }
    }
  }, [])

  // ── Hum — two detuned sines → lowpass → gain ───────────────────────────────
  const startHum = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx || humRef.current) return
    void resumeIfNeeded()

    const now = ctx.currentTime

    const filter = ctx.createBiquadFilter()
    filter.type            = 'lowpass'
    filter.frequency.value = 200
    filter.Q.value         = 0.7

    const gain = ctx.createGain()
    gain.gain.value = 0.0001

    const osc1 = ctx.createOscillator()
    osc1.type            = 'sine'
    osc1.frequency.value = 60

    const osc2 = ctx.createOscillator()
    osc2.type            = 'sine'
    osc2.frequency.value = 60.3

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gain)
    gain.connect(masterRef.current)

    osc1.start(now)
    osc2.start(now)

    // Ramp up to 0.04 over 1.2s (exponentialRamp requires >0 start value)
    gain.gain.exponentialRampToValueAtTime(0.04, now + 1.2)

    humRef.current = { osc1, osc2, gain, filter }
  }, [ensureCtx, resumeIfNeeded])

  const stopHum = useCallback(() => {
    const ctx = ctxRef.current
    const h   = humRef.current
    if (!ctx || !h) return

    const now = ctx.currentTime
    try {
      h.gain.gain.cancelScheduledValues(now)
      h.gain.gain.setValueAtTime(Math.max(h.gain.gain.value, 0.0001), now)
      h.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
      h.osc1.stop(now + 0.35)
      h.osc2.stop(now + 0.35)
    } catch { /* already stopped */ }

    // Schedule disconnect after fadeout
    setTimeout(() => {
      try { h.osc1.disconnect() } catch { /* ignore */ }
      try { h.osc2.disconnect() } catch { /* ignore */ }
      try { h.filter.disconnect() } catch { /* ignore */ }
      try { h.gain.disconnect() }   catch { /* ignore */ }
    }, 400)

    humRef.current = null
  }, [])

  // ── Ignite — layered sine+triangle sweep up with filter sweep ─────────────
  const playIgnite = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx) return
    void resumeIfNeeded()

    const now = ctx.currentTime
    const TOTAL = 0.8
    const SWEEP = 0.3

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 1.0
    filter.frequency.setValueAtTime(400, now)
    filter.frequency.exponentialRampToValueAtTime(4000, now + SWEEP)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.04, now + SWEEP)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + TOTAL)

    const oscSine = ctx.createOscillator()
    oscSine.type = 'sine'
    oscSine.frequency.setValueAtTime(200, now)
    oscSine.frequency.exponentialRampToValueAtTime(1200, now + SWEEP)

    const oscTri = ctx.createOscillator()
    oscTri.type = 'triangle'
    oscTri.frequency.setValueAtTime(200, now)
    oscTri.frequency.exponentialRampToValueAtTime(1200, now + SWEEP)

    const triGain = ctx.createGain()
    triGain.gain.value = 0.5  // triangle half-amplitude vs sine

    oscSine.connect(filter)
    oscTri.connect(triGain)
    triGain.connect(filter)
    filter.connect(gain)
    gain.connect(masterRef.current)

    oscSine.start(now)
    oscTri.start(now)
    oscSine.stop(now + TOTAL + 0.02)
    oscTri.stop(now + TOTAL + 0.02)

    const nodes = [oscSine, oscTri, triGain, filter, gain]
    activeNodesRef.current.push(nodes)

    setTimeout(() => {
      nodes.forEach((n) => { try { n.disconnect() } catch { /* ignore */ } })
      activeNodesRef.current = activeNodesRef.current.filter((n) => n !== nodes)
    }, (TOTAL + 0.1) * 1000)
  }, [ensureCtx, resumeIfNeeded])

  // ── Terminate — sine descending 800Hz → 100Hz over 0.4s ──────────────────
  const playTerminate = useCallback(() => {
    const ctx = ensureCtx()
    if (!ctx) return
    void resumeIfNeeded()

    const now = ctx.currentTime
    const TOTAL   = 0.4
    const ATTACK  = 0.02
    const DECAY   = 0.38

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1000
    filter.Q.value = 0.9

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + ATTACK)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ATTACK + DECAY)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + TOTAL)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(masterRef.current)

    osc.start(now)
    osc.stop(now + TOTAL + 0.02)

    const nodes = [osc, filter, gain]
    activeNodesRef.current.push(nodes)

    setTimeout(() => {
      nodes.forEach((n) => { try { n.disconnect() } catch { /* ignore */ } })
      activeNodesRef.current = activeNodesRef.current.filter((n) => n !== nodes)
    }, (TOTAL + 0.1) * 1000)
  }, [ensureCtx, resumeIfNeeded])

  // ── Auto start/stop hum on isCallActive transitions ──────────────────────
  useEffect(() => {
    if (isCallActive) {
      startHum()
    } else {
      stopHum()
    }
  }, [isCallActive, startHum, stopHum])

  // ── Unmount cleanup — stop everything, close context ─────────────────────
  useEffect(() => {
    return () => {
      const h = humRef.current
      if (h) {
        try { h.osc1.stop() } catch { /* ignore */ }
        try { h.osc2.stop() } catch { /* ignore */ }
        try { h.osc1.disconnect() } catch { /* ignore */ }
        try { h.osc2.disconnect() } catch { /* ignore */ }
        try { h.filter.disconnect() } catch { /* ignore */ }
        try { h.gain.disconnect() } catch { /* ignore */ }
        humRef.current = null
      }
      activeNodesRef.current.forEach((nodes) => {
        nodes.forEach((n) => {
          try { n.stop?.() } catch { /* ignore */ }
          try { n.disconnect() } catch { /* ignore */ }
        })
      })
      activeNodesRef.current = []
      try { void ctxRef.current?.close() } catch { /* ignore */ }
      ctxRef.current    = null
      masterRef.current = null
    }
  }, [])

  return { playIgnite, playTerminate }
}
