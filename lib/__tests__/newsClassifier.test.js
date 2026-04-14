import { describe, test, expect } from 'vitest'
import { classifyWithKeywords } from '../newsClassifier.js'

describe('classifyWithKeywords', () => {
  // Bucket C — thesis risk (must never be missed)
  test('export restriction → C', () => {
    expect(classifyWithKeywords('US expands export restrictions on H100 chips to China')).toBe('C')
  })
  test('export ban on Blackwell → C', () => {
    expect(classifyWithKeywords('Biden admin to ban Blackwell chip exports to Middle East')).toBe('C')
  })
  test('hyperscaler capex cut → C', () => {
    expect(classifyWithKeywords('Microsoft cuts data center capex by 20% amid AI slowdown')).toBe('C')
  })
  test('AI spending slowdown → C', () => {
    expect(classifyWithKeywords('Report: AI spending declines among major cloud providers')).toBe('C')
  })
  test('antitrust → C', () => {
    expect(classifyWithKeywords('DOJ launches antitrust investigation into Nvidia GPU monopoly')).toBe('C')
  })

  // Bucket B — thesis support
  test('hyperscaler capex increase → B', () => {
    expect(classifyWithKeywords('Amazon increases data center capex by $15B for AI expansion')).toBe('B')
  })
  test('Jensen Huang mention → B', () => {
    expect(classifyWithKeywords('Jensen Huang signals strong demand for Blackwell through 2026')).toBe('B')
  })
  test('analyst upgrade → B', () => {
    expect(classifyWithKeywords('Goldman raises Nvidia price target to $300 on AI demand')).toBe('B')
  })
  test('earnings beat → B', () => {
    expect(classifyWithKeywords('Nvidia earnings beat estimates by 12%, revenue guidance raised')).toBe('B')
  })
  test('contract win → B', () => {
    expect(classifyWithKeywords('Nvidia wins $2B AWS contract for Blackwell GPU clusters')).toBe('B')
  })

  // Bucket A — noise
  test('generic AI commentary → A', () => {
    expect(classifyWithKeywords('Analysts remain bullish on AI sector heading into Q2')).toBe('A')
  })
  test('sector rotation → A', () => {
    expect(classifyWithKeywords('Sector rotation into value stocks continues this week')).toBe('A')
  })
  test('options flow → A', () => {
    expect(classifyWithKeywords('Unusual options flow detected in semiconductor names')).toBe('A')
  })

  // Ambiguous → null (goes to Claude in /api/analysis)
  test('ambiguous export compliance mention → null', () => {
    expect(classifyWithKeywords('Nvidia discusses export compliance updates in annual filing')).toBeNull()
  })
  test('capex without direction → null', () => {
    expect(classifyWithKeywords('Meta outlines capex plans for next year at analyst day')).toBeNull()
  })
})
