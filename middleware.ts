import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });
  const isAuthenticated = !!token;
  const isLoginPage = request.nextUrl.pathname === '/login';

  // Redirect authenticated users away from login page to dashboard
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow all other routes to proceed
  return NextResponse.next();
}

// Match only the login page
export const config = {
  matcher: ['/login'],
}; 