import { getRedis } from '@/lib/redis'
import { safeParse } from '@/lib/safeParse'
import { getUserId } from '@/lib/auth'

const getKey = (userId) => `payouts:${userId}`

export async function GET() {
  try {
    const userId = await getUserId()
    const redis = getRedis()
    const raw = await redis.get(getKey(userId))
    const payouts = safeParse(raw) ?? []
    return Response.json(Array.isArray(payouts) ? payouts : [])
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId()
    const { amount, date } = await request.json()
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return Response.json({ error: 'Valid amount required' }, { status: 400 })
    }
    const redis = getRedis()
    const raw = await redis.get(getKey(userId))
    const payouts = safeParse(raw) ?? []
    const arr = Array.isArray(payouts) ? payouts : []
    const newPayout = {
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      date: date ?? null,
      created_at: new Date().toISOString(),
    }
    arr.unshift(newPayout)
    await redis.set(getKey(userId), JSON.stringify(arr))
    return Response.json(newPayout)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const userId = await getUserId()
    const { id } = await request.json()
    const redis = getRedis()
    const raw = await redis.get(getKey(userId))
    const payouts = safeParse(raw) ?? []
    const arr = Array.isArray(payouts) ? payouts : []
    const updated = arr.filter(p => p.id !== id)
    await redis.set(getKey(userId), JSON.stringify(updated))
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
