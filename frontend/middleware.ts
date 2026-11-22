import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { BLOCKED_CRAWLERS, SCANNERS } from '@/lib/crawlers';

/**
 * Runs before every page:
 *  1. Refuses vulnerability scanners, AI-training crawlers and bulk scrapers (robots.txt asks them to stay out;
 *     this enforces it), and answers well-known attack probes (/.env, /wp-login.php, …) with a bare 404.
 *  2. Role-based route protection (PRD SEC-03). The session JWT is issued by the FastAPI auth routes.
 * The API (/api/*) has its own guard in api/index.py.
 */

const DEV_SECRET = 'volentify-local-development-secret-change-me';
const RULES: { prefix: string; roles?: string[] }[] = [
  { prefix: '/admin', roles: ['INCIDENT_ADMIN'] },
  { prefix: '/agency', roles: ['INCIDENT_ADMIN', 'NGO_MEMBER'] },
  { prefix: '/dashboard' },
  { prefix: '/onboarding' },
];

const BAD_AGENTS = [...SCANNERS, ...BLOCKED_CRAWLERS].map((a) => a.toLowerCase());
/** Paths that only exist on other software: anyone asking for them is probing for a weakness. */
const PROBE =
  /^\/(?:\.(?:env|git|svn|hg|aws|ssh|htaccess|htpasswd|DS_Store|vscode|idea)(?:\/|$|\.)|wp-(?:admin|login|content|includes|config)|xmlrpc\.php|phpmyadmin|pma\/|myadmin|cgi-bin|server-status|actuator|vendor\/phpunit|boaform|HNAP1|owa\/|ecp\/|autodiscover|solr\/|jenkins|manager\/html|console\/|telescope|_ignition|debug\/default)|\.(?:php\d?|asp|aspx|jsp|cgi|pl|sql|bak|old|swp|ini|log|sh|yml|yaml|env|config)$/i;
/** Always served, even to refused crawlers, so they can read that they are refused. */
const ALWAYS_OPEN = new Set(['/robots.txt', '/sitemap.xml']);

interface Claims { sub: string; role: string; onboarded: boolean; verified: boolean }

const clean = (value?: string) => (value ?? '').trim().replace(/^"+|"+$/g, '');

async function signingKey(): Promise<string> {
  const explicit = clean(process.env.NEXTAUTH_SECRET) || clean(process.env.SESSION_SECRET);
  if (explicit) return explicit;
  // Same order as DATABASE_URL_VARS in api/_lib/core/config.py (static reads so the Edge runtime sees them).
  const dbUrl = [process.env.DATABASE_URL, process.env.DB_URL, process.env.POSTGRES_URL, process.env.DB_POSTGRES_URL,
    process.env.DATABASE_POSTGRES_URL, process.env.NEON_DATABASE_URL, process.env.DATABASE_URL_UNPOOLED,
    process.env.DB_URL_UNPOOLED].map(clean).find(Boolean);
  if (dbUrl) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`volentify-session-v1|${dbUrl}`));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return process.env.VERCEL_ENV ? '' : DEV_SECRET;
}

async function readSession(req: NextRequest): Promise<Claims | null> {
  const token = req.cookies.get('volentify_session')?.value;
  if (!token) return null;
  const secret = await signingKey();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    return payload.typ === 'session' ? (payload as unknown as Claims) : null;
  } catch {
    return null;
  }
}

function refuse(status: 403 | 404) {
  return new NextResponse(status === 404 ? 'Not found' : 'Automated access to this site is not permitted.', {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (ALWAYS_OPEN.has(pathname)) return NextResponse.next();
  if (PROBE.test(pathname)) return refuse(404);
  const agent = (req.headers.get('user-agent') ?? '').toLowerCase();
  // Every browser sends a user agent; an empty one is a script.
  if (!agent || BAD_AGENTS.some((a) => agent.includes(a))) return refuse(403);

  const rule = RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (!rule) return NextResponse.next();

  const claims = await readSession(req);
  if (!claims) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (rule.prefix !== '/onboarding' && !claims.onboarded) {
    const url = new URL('/onboarding', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  if (rule.roles && (!rule.roles.includes(claims.role) || !claims.verified)) {
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('denied', rule.prefix.slice(1));
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Every page and probe path; not the API (guarded separately) or Next's own build assets.
export const config = { matcher: ['/((?!api/|_next/static|_next/image).*)'] };
