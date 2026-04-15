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
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain — no deployment
  // protection, safe for server-to-server internal API calls on Vercel.
  // VERCEL_URL is the per-deployment URL which may be protected (returns 401).
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
