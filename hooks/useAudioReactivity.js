'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Pipes Vapi's assistant audio output AND the user's microphone input through
 * separate Web Audio AnalyserNodes. Returns smoothed, normalised volume
 * levels (0..1) for each source on requestAnimationFrame tick.
 *
 * Both analysers share a single AudioContext (browsers rate-limit contexts
 * and there's no reason to burn a second one — one graph, two nodes).
 *
 * Cleans up the graph, mic stream, and rAF loop when isCallActive flips false.
 */
export default function useAudioReactivity({
  isCallActive,
  selector = 'audio',
  smoothing = 0.22,
}) {
  const [assistantVolume, setAssistantVolume] = useState(0)
  const [userVolume,      setUserVolume]      = useState(0)

  const ctxRef            = useRef(null)
  const assistantAnRef    = useRef(null)
  const assistantDataRef  = useRef(null)
  const userAnRef         = useRef(null)
  const userDataRef       = useRef(null)
  const userStreamRef     = useRef(null)
  const rafRef            = useRef(null)
  const smoothAssistRef   = useRef(0)
  const smoothUserRef     = useRef(0)
  const seenRef           = useRef(new WeakSet())

  useEffect(() => {
    if (!isCallActive) return
    if (typeof window === 'undefined') return

    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return

    let cancelled = false
    let tapInterval = null

    const ctx = new Ctor()
    ctxRef.current = ctx

    const assistantAn = ctx.createAnalyser()
    assistantAn.fftSize = 256
    assistantAn.smoothingTimeConstant = 0.75
    assistantAnRef.current = assistantAn
    assistantDataRef.current = new Uint8Array(assistantAn.frequencyBinCount)

    const userAn = ctx.createAnalyser()
    userAn.fftSize = 256
    userAn.smoothingTimeConstant = 0.75
    userAnRef.current = userAn
    userDataRef.current = new Uint8Array(userAn.frequencyBinCount)

    const resumeIfNeeded = async () => {
      if (ctx.state === 'suspended') {
        try { await ctx.resume() } catch { /* ignore */ }
      }
    }
    void resumeIfNeeded()

    // ── Assistant pipeline — tap Vapi's injected <audio> elements ──────────────
    const tryTap = () => {
      const els = document.querySelectorAll(selector)
      els.forEach((el) => {
        if (seenRef.current.has(el)) return
        seenRef.current.add(el)
        try {
          const stream = el.srcObject
          let src = null
          if (stream instanceof MediaStream) {
            src = ctx.createMediaStreamSource(stream)
          } else if (el.src) {
            src = ctx.createMediaElementSource(el)
            src.connect(ctx.destination)
          }
          if (src) src.connect(assistantAn)
        } catch {
          /* already wired to another graph — leave it */
        }
      })
    }
    tryTap()
    tapInterval = setInterval(tryTap, 500)

    // ── User pipeline — getUserMedia, route into userAn ────────────────────────
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        userStreamRef.current = stream
        try {
          const src = ctx.createMediaStreamSource(stream)
          src.connect(userAn)
        } catch { /* ignore */ }
      })
      .catch(() => { /* mic denied — userVolume stays 0 */ })

    const tick = () => {
      if (cancelled) return

      const aA = assistantAnRef.current
      const aD = assistantDataRef.current
      if (aA && aD) {
        aA.getByteFrequencyData(aD)
        let sum = 0
        for (let i = 0; i < aD.length; i++) sum += aD[i]
        const avg = sum / aD.length / 255
        smoothAssistRef.current += (avg - smoothAssistRef.current) * smoothing
        setAssistantVolume(smoothAssistRef.current)
      }

      const uA = userAnRef.current
      const uD = userDataRef.current
      if (uA && uD) {
        uA.getByteFrequencyData(uD)
        let sum = 0
        for (let i = 0; i < uD.length; i++) sum += uD[i]
        const avg = sum / uD.length / 255
        smoothUserRef.current += (avg - smoothUserRef.current) * smoothing
        setUserVolume(smoothUserRef.current)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (tapInterval) clearInterval(tapInterval)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      try { assistantAnRef.current?.disconnect() } catch { /* ignore */ }
      try { userAnRef.current?.disconnect() }      catch { /* ignore */ }
      try {
        userStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch { /* ignore */ }
      try { void ctxRef.current?.close() } catch { /* ignore */ }
      assistantAnRef.current   = null
      assistantDataRef.current = null
      userAnRef.current        = null
      userDataRef.current      = null
      userStreamRef.current    = null
      ctxRef.current           = null
      smoothAssistRef.current  = 0
      smoothUserRef.current    = 0
      seenRef.current          = new WeakSet()
      setAssistantVolume(0)
      setUserVolume(0)
    }
  }, [isCallActive, selector, smoothing])

  return { assistantVolume, userVolume }
}
