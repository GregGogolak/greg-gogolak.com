/**
 * Safely parse a value that may be a JSON string or already a parsed object.
 * Upstash Redis auto-deserialises JSON on read, so values may arrive either
 * as strings or as already-parsed objects. This handles both forms.
 *
 * @param {*} val
 * @param {*} fallback - returned when val is null or undefined
 */
export function safeParse(val, fallback) {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val  // already deserialised by Upstash
}
