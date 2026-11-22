/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV === 'development';
/** Deployed on Vercel (always https). `next start` on a laptop is plain http, so it must not force https. */
const deployed = Boolean(process.env.VERCEL_ENV);

/**
 * Content Security Policy: the page may only load code from this site, and only talk to the services the map,
 * routing, geocoding and facility lookups actually use. Inline scripts stay allowed because Next.js hydrates with
 * them; everything else (other script hosts, plugins, being framed by another site) is refused.
 */
const MAP_HOSTS = [
  'https://basemaps.cartocdn.com', 'https://*.basemaps.cartocdn.com', 'https://server.arcgisonline.com',
  'https://services.arcgisonline.com', 'https://gibs.earthdata.nasa.gov', 'https://api.rainviewer.com',
  'https://tilecache.rainviewer.com', 'https://s3.amazonaws.com', 'https://demotiles.maplibre.org',
];
const LOOKUP_HOSTS = [
  'https://router.project-osrm.org', 'https://nominatim.openstreetmap.org', 'https://overpass-api.de',
  'https://overpass.kumi.systems', 'https://maps.mail.ru',
];
const ANALYTICS_HOSTS = ['https://va.vercel-scripts.com', 'https://vitals.vercel-insights.com'];

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${[...MAP_HOSTS, ...LOOKUP_HOSTS, ...ANALYTICS_HOSTS].join(' ')}${dev ? ' ws: http://127.0.0.1:8000' : ''}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "manifest-src 'self'",
  ...(deployed ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=(), browsing-topics=()' },
];

/** Personal and role-gated pages are never indexed, even if a link to them leaks. */
const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
const PRIVATE = ['/admin/:path*', '/agency/:path*', '/dashboard/:path*', '/onboarding/:path*', '/profile/:path*',
  '/volunteers/:path*', '/auth/:path*', '/login', '/register'];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /news duplicated /alerts (both listed command advisories and NDMA warnings); keep old links working.
  async redirects() {
    return [{ source: '/news', destination: '/alerts', permanent: true }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...PRIVATE.map((source) => ({ source, headers: noindex })),
    ];
  },
  // Local development: proxy /api/* to the FastAPI dev server (npm run dev starts both).
  // On Vercel, vercel.json routes /api/* to the Python function instead.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [{ source: '/api/:path*', destination: `${process.env.API_DEV_ORIGIN || 'http://127.0.0.1:8000'}/api/:path*` }];
  },
};

export default nextConfig;
