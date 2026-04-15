export const EARNINGS_DATE = '2026-05-20'
export const FOMC_DATE     = '2026-04-28'

export const CONFIG_DEFAULTS = {
  priceDrop:       true,
  interestErosion: true,
  oilMove:         true,
  earnings14d:     true,
  earnings3d:      true,
}

export function getBaseUrl() {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
}
