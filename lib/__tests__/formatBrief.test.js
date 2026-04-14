import { describe, test, expect } from 'vitest'
import { formatBrief } from '../formatBrief.js'

const BASE = {
  price: { price: 110.50, pctChange: -1.2, sma200Pct: -2.1, sma50Pct: 0.5, volumeRatio: 1.4 },
  macro: {
    oil: { price: 82.50, pctChange: 1.2, twoSessionPct: 3.1 },
    qqq: { pctChange: -0.8 },
    vix: { level: 24.5 },
  },
  news: [
    { bucket: 'C', headline: 'US expands export ban on H100 chips', source: 'Reuters' },
    { bucket: 'A', headline: 'Analysts remain cautious on AI stocks', source: 'Bloomberg' },
  ],
  positions: [
    { type: 'CONVICTION', shares: 100, entryPrice: 115.00, daysHeld: 3, grossPnl: -450 },
  ],
  fundamentals: { analystTarget: 264, targetGapPct: 138.9, daysToEarnings: 36, daysToFomc: 14 },
}

describe('formatBrief', () => {
  test('returns a string', () => {
    expect(typeof formatBrief(BASE)).toBe('string')
  })
  test('includes current price', () => {
    expect(formatBrief(BASE)).toContain('110.50')
  })
  test('includes 200 SMA label', () => {
    expect(formatBrief(BASE)).toContain('200 SMA')
  })
  test('includes oil price', () => {
    expect(formatBrief(BASE)).toContain('82.50')
  })
  test('includes bucket C article', () => {
    const brief = formatBrief(BASE)
    expect(brief).toContain('[C]')
    expect(brief).toContain('export ban on H100')
  })
  test('includes analyst target', () => {
    expect(formatBrief(BASE)).toContain('264')
  })
  test('includes days to earnings', () => {
    const brief = formatBrief(BASE)
    expect(brief).toContain('Days to earnings')
    expect(brief).toContain('36')
  })
  test('includes position type', () => {
    expect(formatBrief(BASE)).toContain('CONVICTION')
  })
  test('handles empty positions', () => {
    expect(formatBrief({ ...BASE, positions: [] })).toContain('None')
  })
  test('handles empty news', () => {
    expect(formatBrief({ ...BASE, news: [] })).toContain('No recent news')
  })
})
