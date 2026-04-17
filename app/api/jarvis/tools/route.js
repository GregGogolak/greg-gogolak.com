import { buildJarvisContext } from '@/lib/jarvisContext'

/**
 * Vapi tool-call webhook.
 *
 * Vapi POSTs a payload of shape:
 *   { message: { toolCalls: [{ id, function: { name, arguments } }] } }
 *
 * Authenticated via the x-vapi-secret header matching VAPI_WEBHOOK_SECRET.
 * Returns the Vapi-expected response:
 *   { results: [{ toolCallId, result: <stringified JSON> }] }
 */
export async function POST(req) {
  try {
    const secret = req.headers.get('x-vapi-secret')
    if (!secret || secret !== process.env.VAPI_WEBHOOK_SECRET) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const toolCalls = body?.message?.toolCalls ?? []

    const results = await Promise.all(
      toolCalls.map(async (call) => {
        const name = call?.function?.name
        const args = call?.function?.arguments
        const parsedArgs = typeof args === 'string'
          ? (() => { try { return JSON.parse(args) } catch { return {} } })()
          : (args || {})
        const userId = parsedArgs.userId ?? null
        const context = await buildJarvisContext(name, userId)
        return {
          toolCallId: call.id,
          result:     JSON.stringify(context),
        }
      })
    )

    return Response.json({ results })
  } catch (err) {
    console.error('[/api/jarvis/tools]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
