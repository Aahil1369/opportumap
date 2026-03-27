import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Everything is public by default — only these routes require sign-in
const isProtectedRoute = createRouteMatcher([
  '/api/community/likes(.*)',
  '/api/community/follows(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files entirely
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)).*)',
    '/(api|trpc)(.*)',
  ],
};
