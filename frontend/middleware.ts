import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-based route access definitions
const ROLE_ACCESS: Record<string, string[]> = {
  '/dashboard': ['VOLUNTEER', 'NGO_MEMBER', 'RESEARCHER', 'INCIDENT_ADMIN'],
  '/admin': ['INCIDENT_ADMIN'],
  '/agency': ['NGO_MEMBER', 'INCIDENT_ADMIN'],
  '/government': ['INCIDENT_ADMIN', 'NGO_MEMBER'],
  '/research': ['RESEARCHER', 'INCIDENT_ADMIN', 'NGO_MEMBER'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static files and Next.js internal routes bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
