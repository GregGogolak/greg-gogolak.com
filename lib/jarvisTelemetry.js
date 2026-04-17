/**
 * jarvisTelemetry — atmospheric telemetry generator for the HUD.
 *
 * Produces plausible-looking readouts that update at different cadences
 * so the corner data blocks feel alive. Values drift smoothly using
 * a module-level state bag — not a generator or class, just bounded
 * random walks keyed to the tick counter.
 *
 * The data is purely cosmetic. Nothing here reflects real telemetry.
 *
 * Exports:
 *   generateTelemetrySnapshot(status, volume, userVolume, tick) → snapshot
 */

// ── Module state — survives between renders (single HUD instance assumed) ──
const state = {
  streamId:          null,      // generated per call
  baseLat:           51.5074,   // London-ish starting drift point
  baseLng:           -0.1278,
  latDrift:          0,
  lngDrift:          0,
  integrity:         99.94,
  integrityVel:      0,
  signalStrength:    0.7,
  signalVel:         0,
  lastFrequencyTick: -1,
  lastFrequency:     'OFFLINE',
  callStartMs:       null,
  lastStatus:        'idle',
  waveformSeed:      Math.floor(Math.random() * 0xffffffff),
}

// Bounded random walk helper — pushes value toward centre, adds noise
const drift = (value, velocity, target, k, damping, noise) => {
  const accel = (target - value) * k - velocity * damping
  const newVel = velocity + accel + (Math.random() - 0.5) * noise
  return [value + newVel, newVel]
}

const hex = (n, len) => {
  const s = n.toString(16).toUpperCase()
  return s.length >= len ? s.slice(-len) : s.padStart(len, '0')
}

const formatCoord = (value, posSuffix, negSuffix) => {
  const abs = Math.abs(value)
  const deg = abs.toFixed(4)
  return `${deg}° ${value >= 0 ? posSuffix : negSuffix}`
}

const formatUptime = (ms) => {
  if (ms == null || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const newStreamId = () => {
  const n   = Math.floor(Math.random() * 10000)
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ']
  const g   = greek[Math.floor(Math.random() * greek.length)]
  return `J-${n.toString().padStart(4, '0')}-${g}`
}

const pickFrequency = () => {
  // One of a handful of plausible-sounding freqs
  const freqs = ['2.4048 GHz', '5.8125 GHz', '1.2275 GHz', '3.9921 GHz']
  return freqs[Math.floor(Math.random() * freqs.length)]
}

export function generateTelemetrySnapshot(status, volume = 0, userVolume = 0, tick = 0) {
  // ── Status transition handling ───────────────────────────────────────────
  if (status !== state.lastStatus) {
    if (status === 'connecting' || (state.lastStatus === 'idle' && status !== 'idle')) {
      state.streamId        = newStreamId()
      state.lastFrequency   = pickFrequency()
      state.callStartMs     = Date.now()
      state.integrity       = 99.94
      state.integrityVel   = 0
      state.signalStrength  = 0.7
      state.signalVel       = 0
    }
    if (status === 'idle') {
      state.callStartMs = null
    }
    state.lastStatus = status
  }

  // ── Idle snapshot — structure present, values inert ──────────────────────
  if (status === 'idle') {
    return {
      coordinates:     { lat: '— — —', lng: '— — —' },
      frequency:       'OFFLINE',
      waveform_hash:   '0x———— ———',
      uptime:          '—:—:—',
      voice_confidence:'—.—%',
      integrity:       '—.—%',
      stream_id:       '———',
      encoding:        'OPUS 48K · 256KBPS',
      protocol:        'WSS/HTTPS · TLS 1.3',
      signal_strength: 0,
    }
  }

  // ── Coordinates — drift every 8 ticks ───────────────────────────────────
  if (tick % 8 === 0) {
    ;[state.latDrift] = [state.latDrift + (Math.random() - 0.5) * 0.0008]
    ;[state.lngDrift] = [state.lngDrift + (Math.random() - 0.5) * 0.0008]
    // bound drift to ±0.02 so coords don't wander off
    state.latDrift = Math.max(-0.02, Math.min(0.02, state.latDrift))
    state.lngDrift = Math.max(-0.02, Math.min(0.02, state.lngDrift))
  }
  const lat = state.baseLat + state.latDrift
  const lng = state.baseLng + state.lngDrift

  // ── Waveform hash — updates every 2 ticks ────────────────────────────────
  let waveformHash = '0x7A3F…B9D2'
  if (tick % 2 === 0) {
    // Deterministic-ish from tick, volume, seed
    const mix = (state.waveformSeed ^ (tick * 2654435761)) >>> 0
    const volBits = Math.floor(volume * 0xffff) << 16
    const userBits = Math.floor(userVolume * 0xff) << 8
    const left  = (mix ^ volBits ^ userBits) >>> 0
    const right = (((mix * 2246822519) >>> 0) ^ Math.floor(Math.random() * 0xffff)) >>> 0
    waveformHash = `0x${hex(left, 4)}…${hex(right, 4)}`
  } else {
    // Keep prior-ish stable between updates — reuse last hex from mix without tick bump
    const mix = (state.waveformSeed ^ ((tick - 1) * 2654435761)) >>> 0
    const volBits = Math.floor(volume * 0xffff) << 16
    const left  = (mix ^ volBits) >>> 0
    const right = ((mix * 2246822519) >>> 0) >>> 0
    waveformHash = `0x${hex(left, 4)}…${hex(right, 4)}`
  }

  // ── Integrity — breathes between 99.80 and 99.99 ─────────────────────────
  ;[state.integrity, state.integrityVel] = drift(
    state.integrity, state.integrityVel,
    99.94, 0.015, 0.25, 0.02,
  )
  if (state.integrity > 99.99) { state.integrity = 99.99; state.integrityVel = -Math.abs(state.integrityVel) }
  if (state.integrity < 99.80) { state.integrity = 99.80; state.integrityVel =  Math.abs(state.integrityVel) }

  // ── Signal strength — 0..1 bounded walk ──────────────────────────────────
  const signalTarget = 0.7 + volume * 0.2 + userVolume * 0.1
  ;[state.signalStrength, state.signalVel] = drift(
    state.signalStrength, state.signalVel,
    signalTarget, 0.02, 0.3, 0.015,
  )
  state.signalStrength = Math.max(0.25, Math.min(1, state.signalStrength))

  // ── Voice confidence — volume-driven with floor ──────────────────────────
  const conf = Math.max(0, Math.min(0.999, volume * 0.9 + 0.08 + (Math.random() - 0.5) * 0.02))

  // ── Uptime from call start ───────────────────────────────────────────────
  const uptime = formatUptime(state.callStartMs == null ? 0 : Date.now() - state.callStartMs)

  return {
    coordinates:      { lat: formatCoord(lat, 'N', 'S'), lng: formatCoord(lng, 'E', 'W') },
    frequency:        state.lastFrequency,
    waveform_hash:    waveformHash,
    uptime,
    voice_confidence: `${(conf * 100).toFixed(1)}%`,
    integrity:        `${state.integrity.toFixed(2)}%`,
    stream_id:        state.streamId ?? '———',
    encoding:         'OPUS 48K · 256KBPS',
    protocol:         'WSS/HTTPS · TLS 1.3',
    signal_strength:  state.signalStrength,
  }
}

export default generateTelemetrySnapshot
