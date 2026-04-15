export function getETTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

export function getMarketSession() {
  const et  = getETTime()
  const day = et.getDay()
  const t   = et.getHours() * 60 + et.getMinutes()
  if (day === 0 || day === 6)              return 'closed'
  if (t >= 240  && t < 570)               return 'premarket'
  if (t >= 570  && t < 960)               return 'open'
  if (t >= 960  && t < 1200)              return 'afterhours'
  return 'closed'
}

function minutesUntilNextPremarket() {
  const et  = getETTime()
  const day = et.getDay()
  const t   = et.getHours() * 60 + et.getMinutes()
  const rem = 1440 - t // minutes until midnight ET

  if (day === 0) return rem + 240            // Sunday  → Monday 04:00
  if (day === 6) return rem + 1440 + 240     // Saturday → Monday 04:00
  if (t < 240)   return 240 - t             // weekday, before premarket today
  if (day === 5) return rem + 2 * 1440 + 240 // Friday after 20:00 → Monday 04:00
  return rem + 240                           // Mon–Thu after 20:00 → next day 04:00
}

export function getCountdown(session) {
  const et = getETTime()
  const t  = et.getHours() * 60 + et.getMinutes()

  let totalMinutes
  if      (session === 'open')       totalMinutes = 960  - t
  else if (session === 'premarket')  totalMinutes = 570  - t
  else if (session === 'afterhours') totalMinutes = 1200 - t
  else                               totalMinutes = minutesUntilNextPremarket()

  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 }
}
