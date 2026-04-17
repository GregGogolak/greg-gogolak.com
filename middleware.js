import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/login(.*)', '/api/(.*)'])

// Admin-only routes — members get redirected to /track
const isAdminRoute = createRouteMatcher([
  '/',
  '/read(.*)',
  '/brief(.*)',
  '/alerts(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next()

  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = sessionClaims?.metadata?.role ?? 'member'

  // Members trying to access admin routes → redirect to /track
  if (role === 'member' && isAdminRoute(request)) {
    return NextResponse.redirect(new URL('/track', request.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/'],
}
