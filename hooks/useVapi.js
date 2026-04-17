'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Lazy-initialised Vapi wrapper. The SDK is imported dynamically on first
 * startCall() so this hook is safe to use in SSR-rendered components.
 */
export default function useVapi(options) {
  const { publicKey, assistantId } = options

  const vapiRef = useRef(null)
  const [isCallActive,        setIsCallActive]        = useState(false)
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [userVolume,          setUserVolume]          = useState(0)
  const [status,              setStatus]              = useState('idle')
  const [error,               setError]               = useState(null)

  // Keep latest callbacks in a ref so event handlers always see fresh ones
  const cbRef = useRef(options)
  useEffect(() => {
    cbRef.current = options
  }, [options])

  const ensureVapi = useCallback(async () => {
    if (vapiRef.current) return vapiRef.current
    if (typeof window === 'undefined') {
      throw new Error('Vapi can only be initialised in the browser')
    }

    const mod = await import('@vapi-ai/web')
    const candidate =
      (mod.default && typeof mod.default === 'function' && mod.default) ||
      (mod.default && mod.default.default) ||
      mod.Vapi ||
      (typeof mod === 'function' ? mod : null)

    if (typeof candidate !== 'function') {
      throw new Error('Vapi SDK did not expose a constructor')
    }

    const VapiCtor = candidate
    const instance = new VapiCtor(publicKey)

    instance.on('call-start', () => {
      setIsCallActive(true)
      setStatus('listening')
      setError(null)
      cbRef.current.onCallStart?.()
    })

    instance.on('call-end', () => {
      setIsCallActive(false)
      setIsAssistantSpeaking(false)
      setUserVolume(0)
      setStatus('idle')
      cbRef.current.onCallEnd?.()
    })

    instance.on('speech-start', () => {
      setIsAssistantSpeaking(true)
      setStatus('speaking')
    })

    instance.on('speech-end', () => {
      setIsAssistantSpeaking(false)
      setStatus('listening')
    })

    instance.on('volume-level', (...args) => {
      const v = typeof args[0] === 'number' ? args[0] : 0
      setUserVolume(Math.max(0, Math.min(1, v)))
    })

    instance.on('error', (...args) => {
      const err = args[0]
      console.error('[Vapi] error', err)
      setStatus('error')
      setError(err?.errorMsg || err?.message || 'Unknown Vapi error')
      cbRef.current.onError?.(err)
    })

    instance.on('message', (...args) => {
      cbRef.current.onMessage?.(args[0])
    })

    vapiRef.current = instance
    return instance
  }, [publicKey])

  const startCall = useCallback(async () => {
    try {
      setStatus('connecting')
      setError(null)
      const v = await ensureVapi()
      // Surface a friendly error if mic is denied before Vapi tries it
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await v.start(assistantId)
    } catch (err) {
      console.error('[Vapi] startCall failed', err)
      const msg =
        err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
          ? 'Microphone permission denied'
          : err?.message || 'Failed to start call'
      setStatus('error')
      setError(msg)
      cbRef.current.onError?.(err)
    }
  }, [ensureVapi, assistantId])

  const endCall = useCallback(() => {
    try {
      vapiRef.current?.stop()
    } catch (err) {
      console.warn('[Vapi] stop error', err)
    }
  }, [])

  const setMuted = useCallback((muted) => {
    try {
      vapiRef.current?.setMuted?.(muted)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        vapiRef.current?.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  return {
    isCallActive,
    isAssistantSpeaking,
    userVolume,
    status,
    error,
    startCall,
    endCall,
    setMuted,
  }
}
