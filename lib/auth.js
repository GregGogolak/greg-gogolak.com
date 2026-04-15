import { auth } from '@clerk/nextjs/server'

/**
 * Returns the current user's Clerk ID for use in API routes.
 * Used to namespace Redis keys per user.
 *
 * @returns {Promise<string>} userId
 * @throws if called outside an authenticated context
 */
export async function getUserId() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthenticated')
  return userId
}

/**
 * Returns the current user's role from Clerk metadata.
 * Defaults to 'member' if not set.
 *
 * @returns {Promise<'admin'|'member'>}
 */
export async function getUserRole() {
  const { sessionClaims } = await auth()
  return sessionClaims?.metadata?.role ?? 'member'
}
