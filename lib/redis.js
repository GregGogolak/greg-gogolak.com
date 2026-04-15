import { Redis } from '@upstash/redis'

export function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}
