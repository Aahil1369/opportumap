import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  // Refresh Supabase auth session on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for Supabase SSR
  await supabase.auth.getUser();
  return supabaseResponse;
}

export default middleware;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf)).*)',
  ],
};
