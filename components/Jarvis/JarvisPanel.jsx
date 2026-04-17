'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useVapi from '@/hooks/useVapi'
import useAudioReactivity from '@/hooks/useAudioReactivity'
import useJarvisAudio from '@/hooks/useJarvisAudio'
import generateTelemetrySnapshot from '@/lib/jarvisTelemetry'
import VoiceOrb from './VoiceOrb'
import StatusPill from './StatusPill'

const PUBLIC_KEY   = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID

const SUBLABEL = {
  idle:       'AWAITING COMMAND',
  connecting: 'HANDSHAKE IN PROGRESS',
  listening:  'AUDIO INPUT LIVE',
  speaking:   'RESPONSE TRANSMITTING',
  error:      '',
}

const BOOT_IN_MS  = 1400
const BOOT_OUT_MS = 600

export default function JarvisPanel() {
  const {
    isCallActive,
    isAssistantSpeaking,
    status,
    error,
    startCall,
    endCall,
  } = useVapi({
    publicKey:   PUBLIC_KEY,
    assistantId: ASSISTANT_ID,
  })

  const { assistantVolume, userVolume } = useAudioReactivity({ isCallActive })
  const isListening = isCallActive && !isAssistantSpeaking

  const { playIgnite, playTerminate } = useJarvisAudio(isCallActive, status)

  // ── Boot phase — rAF-driven 0..1 animation ───────────────────────────────
  const [bootPhase, setBootPhase] = useState(0)
  const bootPhaseRef     = useRef(0)
  const bootDirectionRef = useRef(0) // +1 = ramp up, -1 = ramp down, 0 = idle
  const bootStartRef     = useRef(0)
  const bootStartValRef  = useRef(0)
  const bootTargetValRef = useRef(0)
  const rafRef           = useRef(null)

  const stopRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const setBoot = (v) => {
    bootPhaseRef.current = v
    setBootPhase(v)
  }

  const rampBoot = useCallback((direction) => {
    stopRaf()
    bootDirectionRef.current = direction
    bootStartRef.current     = performance.now()
    // Start from the CURRENT bootPhase value, not 0 or 1 — avoids jumps when
    // the user terminates mid-boot or initiates mid-shutdown.
    bootStartValRef.current  = bootPhaseRef.current
    bootTargetValRef.current = direction > 0 ? 1 : 0
    const duration = direction > 0 ? BOOT_IN_MS : BOOT_OUT_MS

    const step = (now) => {
      const elapsed = now - bootStartRef.current
      const t = Math.min(1, elapsed / duration)
      // Ease-out cubic for boot-in, linear for boot-out (terminate feels crisper)
      const eased = direction > 0 ? 1 - Math.pow(1 - t, 3) : t
      const from = bootStartValRef.current
      const to   = bootTargetValRef.current
      const value = from + (to - from) * eased
      setBoot(value)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        bootDirectionRef.current = 0
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => stopRaf(), [])

  // When Vapi ends the call on its own (not via our button), ramp bootPhase down
  const prevCallActiveRef = useRef(isCallActive)
  useEffect(() => {
    const was = prevCallActiveRef.current
    prevCallActiveRef.current = isCallActive
    if (was && !isCallActive && bootPhase > 0 && bootDirectionRef.current !== -1) {
      rampBoot(-1)
    }
  }, [isCallActive, bootPhase, rampBoot])

  // ── Telemetry — 120ms cadence, tick counter ──────────────────────────────
  const [telemetry, setTelemetry] = useState(() =>
    generateTelemetrySnapshot('idle', 0, 0, 0),
  )
  const [tickCount, setTickCount] = useState(0)

  useEffect(() => {
    let tick = 0
    const id = setInterval(() => {
      tick += 1
      setTickCount(tick)
      setTelemetry(
        generateTelemetrySnapshot(status, assistantVolume, userVolume, tick),
      )
    }, 120)
    return () => clearInterval(id)
  }, [status, assistantVolume, userVolume])

  // ── Button handlers ──────────────────────────────────────────────────────
  const handleInitiate = useCallback(() => {
    playIgnite()
    rampBoot(1)
    void startCall()
  }, [playIgnite, rampBoot, startCall])

  const handleTerminate = useCallback(() => {
    playTerminate()
    rampBoot(-1)
    // Let the ramp-down mostly complete before tearing down the call so the
    // orb has time to visibly retreat. The hum stops automatically via the
    // isCallActive→false transition inside useJarvisAudio.
    setTimeout(() => { endCall() }, BOOT_OUT_MS - 50)
  }, [playTerminate, rampBoot, endCall])

  const isConnecting   = status === 'connecting'
  const buttonDisabled = isConnecting

  const subLabel = SUBLABEL[status] ?? ''

  return (
    <>
      {/* Background: full-viewport orb + HUD chrome */}
      <VoiceOrb
        volume={assistantVolume}
        userVolume={userVolume}
        isSpeaking={isAssistantSpeaking}
        isListening={isListening}
        status={status}
        bootPhase={bootPhase}
        telemetry={telemetry}
      />

      {/* Top: status pill (centred, high on screen) */}
      <div
        style={{
          position:       'fixed',
          top:            '24px',
          left:           0,
          right:          0,
          display:        'flex',
          justifyContent: 'center',
          zIndex:         10,
          pointerEvents:  'none',
        }}
      >
        <StatusPill status={status} />
      </div>

      {/* Bottom: sub-label + buttons (centred, low on screen) */}
      <div
        style={{
          position:       'fixed',
          bottom:         '40px',
          left:           0,
          right:          0,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            '20px',
          zIndex:         10,
          pointerEvents:  'auto',
        }}
      >
        <div
          style={{
            fontFamily:     'JetBrains Mono, monospace',
            fontSize:       11,
            letterSpacing:  '0.22em',
            color:          'rgba(168,228,255,0.6)',
            textTransform:  'uppercase',
          }}
        >
          {error ? <span style={{ color: '#ef4444' }}>{error}</span> : subLabel}
        </div>
        <button
          onClick={isCallActive ? handleTerminate : handleInitiate}
          disabled={buttonDisabled}
          className={
            isCallActive
              ? 'px-10 py-4 rounded-full bg-[rgba(239,68,68,0.15)] hover:bg-[rgba(239,68,68,0.25)] border-[0.5px] border-[rgba(239,68,68,0.4)] text-[#ef4444] uppercase tracking-[0.1em] text-[12px] font-medium active:scale-[0.97] transition-transform duration-100'
              : 'px-10 py-4 rounded-full bg-[rgba(122,224,255,0.15)] hover:bg-[rgba(122,224,255,0.28)] border-[0.5px] border-[rgba(122,224,255,0.5)] text-[#7ae0ff] uppercase tracking-[0.1em] text-[12px] font-medium active:scale-[0.97] transition-transform duration-100'
          }
          style={{
            minWidth: 260,
            cursor:   buttonDisabled ? 'not-allowed' : 'pointer',
            opacity:  buttonDisabled ? 0.5 : 1,
          }}
        >
          {isCallActive ? 'TERMINATE' : 'INITIATE'}
        </button>
        <div
          style={{
            fontFamily:     'JetBrains Mono, monospace',
            fontSize:       10,
            letterSpacing:  '0.18em',
            color:          'rgba(168,228,255,0.3)',
            textTransform:  'uppercase',
          }}
        >
          J.A.R.V.I.S. · NVDA TERMINAL · TOOLS ACTIVE
        </div>
      </div>
    </>
  )
}
