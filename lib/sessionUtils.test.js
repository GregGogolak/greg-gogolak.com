import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMarketSession, getCountdown } from './sessionUtils.js'

// Helper: set fake ET time by providing a UTC timestamp that corresponds to
// a known ET wall-clock time. EST = UTC-5, EDT = UTC-4.
// These tests use EDT dates (March–Nov) so offset is -4h = -14400000ms.
function setET(hour, minute, dayOfWeek) {
  // dayOfWeek: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // We pick a fixed Monday in EDT: 2026-04-13 (Mon)
  const baseMonday = new Date('2026-04-13T04:00:00Z') // Mon 00:00 EDT
  const dayOffset  = dayOfWeek === 0 ? -1 : (dayOfWeek - 1) // days from Monday
  const ms = baseMonday.getTime()
    + dayOffset * 86400000
    + (dayOfWeek === 0 ? 7 * 86400000 : 0) // handle Sunday wrapping
    + hour * 3600000
    + minute * 60000
  vi.setSystemTime(ms)
}

describe('getMarketSession', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(()  => vi.useRealTimers())

  it('returns open during regular hours on a weekday', () => {
    setET(10, 0, 1) // Monday 10:00 ET
    expect(getMarketSession()).toBe('open')
  })

  it('returns open at 09:30 exactly', () => {
    setET(9, 30, 1)
    expect(getMarketSession()).toBe('open')
  })

  it('returns open at 15:59', () => {
    setET(15, 59, 1)
    expect(getMarketSession()).toBe('open')
  })

  it('returns premarket 04:00-09:29', () => {
    setET(6, 0, 1)
    expect(getMarketSession()).toBe('premarket')
  })

  it('returns premarket at 04:00 exactly', () => {
    setET(4, 0, 1)
    expect(getMarketSession()).toBe('premarket')
  })

  it('returns afterhours 16:00-19:59', () => {
    setET(18, 0, 1)
    expect(getMarketSession()).toBe('afterhours')
  })

  it('returns afterhours at 16:00 exactly', () => {
    setET(16, 0, 1)
    expect(getMarketSession()).toBe('afterhours')
  })

  it('returns closed after 20:00 on a weekday', () => {
    setET(21, 0, 1)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed before 04:00 on a weekday', () => {
    setET(2, 0, 1)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed on Saturday', () => {
    setET(12, 0, 6)
    expect(getMarketSession()).toBe('closed')
  })

  it('returns closed on Sunday', () => {
    setET(12, 0, 0)
    expect(getMarketSession()).toBe('closed')
  })
})

describe('getCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(()  => vi.useRealTimers())

  it('counts down to 16:00 during open session', () => {
    setET(14, 0, 1) // 14:00 ET Monday — 2h to close
    const { h, m } = getCountdown('open')
    expect(h).toBe(2)
    expect(m).toBe(0)
  })

  it('counts down to 09:30 during premarket', () => {
    setET(7, 0, 1) // 07:00 ET Monday — 2h 30m to open
    const { h, m } = getCountdown('premarket')
    expect(h).toBe(2)
    expect(m).toBe(30)
  })

  it('counts down to 20:00 during afterhours', () => {
    setET(18, 30, 1) // 18:30 ET Monday — 1h 30m to close
    const { h, m } = getCountdown('afterhours')
    expect(h).toBe(1)
    expect(m).toBe(30)
  })

  it('counts to next-day premarket when closed on weekday night', () => {
    setET(22, 0, 1) // 22:00 ET Monday — 6h to Tuesday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(6)
    expect(m).toBe(0)
  })

  it('skips weekend: counts from Friday night to Monday premarket', () => {
    setET(22, 0, 5) // 22:00 ET Friday — 54h to Monday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(54)
    expect(m).toBe(0)
  })

  it('counts from Sunday to Monday premarket', () => {
    setET(22, 0, 0) // 22:00 ET Sunday — 6h to Monday 04:00
    const { h, m } = getCountdown('closed')
    expect(h).toBe(6)
    expect(m).toBe(0)
  })
})
